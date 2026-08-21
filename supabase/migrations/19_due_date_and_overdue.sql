-- ============================================================================
-- 19_due_date_and_overdue.sql
-- Customer payment terms, immutable due-date history and Istanbul-safe aging.
-- ============================================================================

alter table public.customer_accounts
  add column if not exists payment_term_days integer not null default 0;

alter table public.customer_accounts
  drop constraint if exists customer_accounts_payment_term_days_check;
alter table public.customer_accounts
  add constraint customer_accounts_payment_term_days_check
  check (payment_term_days between 0 and 365);

create table if not exists public.account_transaction_due_dates (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.account_transactions (id) on delete restrict,
  due_date date not null,
  reason text not null default '',
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_account_transaction_due_dates_latest
  on public.account_transaction_due_dates (transaction_id, created_at desc, id desc);

alter table public.account_transaction_due_dates enable row level security;

create or replace function public.set_default_order_due_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_order_created_at timestamptz;
  v_payment_term_days integer;
begin
  if new.type <> 'ORDER' or new.order_id is null or new.due_date is not null then
    return new;
  end if;

  select orders.created_at into v_order_created_at
  from public.orders
  where orders.id = new.order_id;

  select coalesce(accounts.payment_term_days, 0) into v_payment_term_days
  from public.customer_accounts accounts
  where accounts.customer_id = new.customer_id;

  new.due_date := (v_order_created_at at time zone 'Europe/Istanbul')::date
    + coalesce(v_payment_term_days, 0);
  return new;
end;
$$;

drop trigger if exists set_default_order_due_date on public.account_transactions;
create trigger set_default_order_due_date
  before insert on public.account_transactions
  for each row execute function public.set_default_order_due_date();

create or replace function public.set_account_transaction_due_date(
  p_transaction_id uuid,
  p_due_date date,
  p_reason text default '',
  p_actor_user_id uuid default null
)
returns table(transaction_id uuid, due_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction public.account_transactions%rowtype;
  v_old_due_date date;
begin
  if p_transaction_id is null or p_due_date is null then
    raise exception 'Transaction and due date are required.' using errcode = '22023';
  end if;

  select * into v_transaction
  from public.account_transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Account transaction was not found.' using errcode = 'P0002';
  end if;

  if v_transaction.is_reversal or v_transaction.debit <= 0 then
    raise exception 'Only an original debit transaction can have a due date.' using errcode = '22023';
  end if;

  select coalesce(
    (
      select history.due_date
      from public.account_transaction_due_dates history
      where history.transaction_id = p_transaction_id
      order by history.created_at desc, history.id desc
      limit 1
    ),
    v_transaction.due_date
  ) into v_old_due_date;

  insert into public.account_transaction_due_dates (
    transaction_id, due_date, reason, actor_user_id
  ) values (
    p_transaction_id, p_due_date, coalesce(p_reason, ''), p_actor_user_id
  );

  insert into public.audit_logs (
    actor_user_id, action, resource_type, resource_id, old_value, new_value, metadata
  ) values (
    p_actor_user_id,
    'account_due_date_changed',
    'account_transaction',
    p_transaction_id::text,
    jsonb_build_object('due_date', v_old_due_date),
    jsonb_build_object('due_date', p_due_date),
    jsonb_build_object('reason', coalesce(p_reason, ''))
  );

  return query select p_transaction_id, p_due_date;
end;
$$;

create or replace function public.update_customer_payment_terms(
  p_customer_id uuid,
  p_payment_term_days integer,
  p_actor_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous integer;
begin
  if p_customer_id is null or p_payment_term_days not between 0 and 365 then
    raise exception 'Payment term must be between 0 and 365 days.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.customer_profiles where user_id = p_customer_id) then
    raise exception 'Customer was not found.' using errcode = 'P0002';
  end if;

  select payment_term_days into v_previous
  from public.customer_accounts
  where customer_id = p_customer_id;

  insert into public.customer_accounts (customer_id, payment_term_days)
  values (p_customer_id, p_payment_term_days)
  on conflict (customer_id) do update
  set payment_term_days = excluded.payment_term_days,
      updated_at = now()
  ;

  insert into public.audit_logs (
    actor_user_id, action, resource_type, resource_id, old_value, new_value
  ) values (
    p_actor_user_id,
    'customer_payment_terms_updated',
    'customer_account',
    p_customer_id::text,
    jsonb_build_object('payment_term_days', v_previous),
    jsonb_build_object('payment_term_days', p_payment_term_days)
  );

  return p_payment_term_days;
end;
$$;

create or replace view public.customer_receivable_due_status
with (security_invoker = true)
as
with business_clock as (
  select (now() at time zone 'Europe/Istanbul')::date as today
),
latest_due_date as (
  select distinct on (history.transaction_id)
    history.transaction_id,
    history.due_date,
    history.actor_user_id,
    history.created_at
  from public.account_transaction_due_dates history
  order by history.transaction_id, history.created_at desc, history.id desc
),
active_receivables as (
  select transaction.*
  from public.account_transactions transaction
  where transaction.debit > 0
    and transaction.is_reversal = false
    and transaction.type in ('ORDER', 'ADJUSTMENT', 'OPENING_BALANCE')
    and not exists (
      select 1
      from public.account_transactions reversal
      where reversal.reversed_transaction_id = transaction.id
    )
),
active_allocations as (
  select
    allocation.order_id,
    sum(allocation.allocated_amount)::numeric(14, 2) as paid_amount
  from public.payment_allocations allocation
  join public.payments payment on payment.id = allocation.payment_id
  where payment.status = 'completed'
  group by allocation.order_id
),
receivables as (
  select
    receivable.id as transaction_id,
    receivable.customer_id,
    receivable.order_id,
    orders.order_number,
    receivable.reference,
    receivable.description,
    receivable.created_at,
    receivable.debit::numeric(14, 2) as original_amount,
    least(
      receivable.debit,
      case when receivable.order_id is null then 0 else coalesce(allocation.paid_amount, 0) end
    )::numeric(14, 2) as paid_amount,
    greatest(
      receivable.debit - case when receivable.order_id is null then 0 else coalesce(allocation.paid_amount, 0) end,
      0
    )::numeric(14, 2) as remaining_amount,
    coalesce(
      latest_due.due_date,
      receivable.due_date,
      (orders.created_at at time zone 'Europe/Istanbul')::date + coalesce(account.payment_term_days, 0)
    ) as effective_due_date
  from active_receivables receivable
  left join public.orders orders on orders.id = receivable.order_id
  left join public.customer_accounts account on account.customer_id = receivable.customer_id
  left join active_allocations allocation on allocation.order_id = receivable.order_id
  left join latest_due_date latest_due on latest_due.transaction_id = receivable.id
)
select
  receivable.transaction_id,
  receivable.customer_id,
  coalesce(nullif(profile.full_name, ''), profile.email) as customer_name,
  profile.email as customer_email,
  profile.phone as customer_phone,
  receivable.order_id,
  receivable.order_number,
  receivable.reference,
  receivable.description,
  receivable.created_at,
  receivable.original_amount,
  receivable.paid_amount,
  receivable.remaining_amount,
  receivable.effective_due_date as due_date,
  greatest(receivable.effective_due_date - business_clock.today, 0) as remaining_days,
  greatest(business_clock.today - receivable.effective_due_date, 0) as overdue_days,
  case
    when receivable.remaining_amount <= 0 then 'PAID'
    when receivable.paid_amount > 0 then 'PARTIAL_PAID'
    when receivable.effective_due_date < business_clock.today then 'OVERDUE'
    when receivable.effective_due_date = business_clock.today then 'DUE_TODAY'
    when receivable.effective_due_date <= business_clock.today + 7 then 'APPROACHING'
    else 'OPEN'
  end as status
from receivables receivable
cross join business_clock
left join public.customer_profiles profile on profile.user_id = receivable.customer_id
where receivable.effective_due_date is not null;

create or replace view public.customer_account_summaries
with (security_invoker = true)
as
with ledger_totals as (
  select
    customer_id,
    coalesce(sum(debit), 0)::numeric(14, 2) as total_debit,
    coalesce(sum(credit), 0)::numeric(14, 2) as total_credit,
    coalesce(sum(debit - credit), 0)::numeric(14, 2) as balance,
    max(created_at) as last_transaction_at
  from public.account_transactions
  group by customer_id
),
overdue_totals as (
  select
    customer_id,
    coalesce(sum(remaining_amount), 0)::numeric(14, 2) as overdue_balance
  from public.customer_receivable_due_status
  where overdue_days > 0 and remaining_amount > 0
  group by customer_id
)
select
  profile.user_id as customer_id,
  account.id as account_id,
  coalesce(nullif(profile.full_name, ''), profile.email) as customer_name,
  profile.email,
  profile.phone,
  ('CARI-' || upper(left(replace(profile.user_id::text, '-', ''), 8)))::text as account_code,
  not profile.is_blocked as is_active,
  coalesce(ledger.total_debit, 0)::numeric(14, 2) as total_debit,
  coalesce(ledger.total_credit, 0)::numeric(14, 2) as total_credit,
  coalesce(ledger.balance, 0)::numeric(14, 2) as balance,
  coalesce(overdue.overdue_balance, 0)::numeric(14, 2) as overdue_balance,
  coalesce(account.risk_limit, 0)::numeric(14, 2) as risk_limit,
  (coalesce(account.risk_limit, 0) - coalesce(ledger.balance, 0))::numeric(14, 2) as available_limit,
  (
    coalesce(ledger.balance, 0) > 0
    and coalesce(ledger.balance, 0) > coalesce(account.risk_limit, 0)
  ) as risk_exceeded,
  coalesce(ledger.last_transaction_at, account.last_transaction_at) as last_transaction_at,
  lower(
    concat_ws(
      ' ',
      profile.full_name,
      profile.email,
      profile.phone,
      'CARI-' || left(replace(profile.user_id::text, '-', ''), 8)
    )
  ) as search_text
from public.customer_profiles profile
left join public.customer_accounts account on account.customer_id = profile.user_id
left join ledger_totals ledger on ledger.customer_id = profile.user_id
left join overdue_totals overdue on overdue.customer_id = profile.user_id;

revoke all on public.account_transaction_due_dates from anon, authenticated;
revoke all on public.customer_receivable_due_status from anon, authenticated;
grant select on public.account_transaction_due_dates to service_role;
grant select on public.customer_receivable_due_status to service_role;

revoke all on function public.set_account_transaction_due_date(uuid, date, text, uuid) from public, anon, authenticated;
revoke all on function public.update_customer_payment_terms(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.set_account_transaction_due_date(uuid, date, text, uuid) to service_role;
grant execute on function public.update_customer_payment_terms(uuid, integer, uuid) to service_role;

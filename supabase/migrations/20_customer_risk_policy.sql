-- ============================================================================
-- 20_customer_risk_policy.sql
-- Central, allocation-safe customer risk calculation and configurable policy.
-- ============================================================================

alter table public.customer_accounts
  add column if not exists risk_policy text not null default 'warn',
  add column if not exists risk_warning_threshold integer not null default 80;

alter table public.customer_accounts
  drop constraint if exists customer_accounts_risk_policy_check,
  add constraint customer_accounts_risk_policy_check
    check (risk_policy in ('warn', 'require_approval', 'block')),
  drop constraint if exists customer_accounts_risk_warning_threshold_check,
  add constraint customer_accounts_risk_warning_threshold_check
    check (risk_warning_threshold between 1 and 100),
  drop constraint if exists customer_accounts_risk_limit_check,
  add constraint customer_accounts_risk_limit_check check (risk_limit >= 0);

alter table public.orders
  add column if not exists risk_decision text not null default 'not_checked',
  add column if not exists risk_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists risk_approved_at timestamptz,
  add column if not exists risk_approved_by uuid references auth.users(id) on delete set null;

alter table public.orders
  drop constraint if exists orders_risk_decision_check,
  add constraint orders_risk_decision_check
    check (risk_decision in ('not_checked', 'approved', 'warning', 'approval_required', 'blocked'));

create index if not exists idx_orders_customer_risk_exposure
  on public.orders (user_id, status, payment_status)
  where status <> 'cancelled';

create or replace view public.customer_risk_status
with (security_invoker = true)
as
with ledger as (
  select
    customer_id,
    greatest(round(coalesce(sum(debit - credit), 0), 2), 0)::numeric(14, 2) as ledger_exposure
  from public.account_transactions
  group by customer_id
),
unposted_orders as (
  select
    orders.user_id as customer_id,
    round(coalesce(sum(orders.total), 0), 2)::numeric(14, 2) as unposted_order_exposure
  from public.orders orders
  where (orders.payment_status = 'paid' or orders.status in ('confirmed', 'preparing', 'shipped', 'completed'))
    and orders.status <> 'cancelled'
    and not exists (
      select 1
      from public.account_transactions original
      where original.order_id = orders.id
        and original.customer_id = orders.user_id
        and original.type = 'ORDER'
        and original.is_reversal = false
        and not exists (
          select 1 from public.account_transactions reversal
          where reversal.reversed_transaction_id = original.id
        )
    )
  group by orders.user_id
)
select
  profile.user_id as customer_id,
  account.id as account_id,
  coalesce(account.risk_limit, 0)::numeric(14, 2) as risk_limit,
  coalesce(account.risk_policy, 'warn')::text as risk_policy,
  coalesce(account.risk_warning_threshold, 80)::integer as warning_threshold,
  coalesce(ledger.ledger_exposure, 0)::numeric(14, 2) as ledger_exposure,
  coalesce(unposted.unposted_order_exposure, 0)::numeric(14, 2) as unposted_order_exposure,
  (coalesce(ledger.ledger_exposure, 0) + coalesce(unposted.unposted_order_exposure, 0))::numeric(14, 2) as used_limit,
  (coalesce(account.risk_limit, 0) - coalesce(ledger.ledger_exposure, 0) - coalesce(unposted.unposted_order_exposure, 0))::numeric(14, 2) as available_limit,
  case
    when coalesce(account.risk_limit, 0) <= 0 then 0
    else round(((coalesce(ledger.ledger_exposure, 0) + coalesce(unposted.unposted_order_exposure, 0)) / account.risk_limit) * 100, 2)
  end::numeric(8, 2) as usage_percent,
  (
    coalesce(account.risk_limit, 0) > 0
    and coalesce(ledger.ledger_exposure, 0) + coalesce(unposted.unposted_order_exposure, 0) > account.risk_limit
  ) as risk_exceeded
from public.customer_profiles profile
left join public.customer_accounts account on account.customer_id = profile.user_id
left join ledger on ledger.customer_id = profile.user_id
left join unposted_orders unposted on unposted.customer_id = profile.user_id;

create or replace function public.evaluate_customer_risk(
  p_customer_id uuid,
  p_proposed_amount numeric default 0,
  p_order_id uuid default null
)
returns table(
  ledger_exposure numeric,
  unposted_order_exposure numeric,
  used_limit numeric,
  proposed_amount numeric,
  projected_exposure numeric,
  risk_limit numeric,
  available_limit numeric,
  usage_percent numeric,
  risk_policy text,
  warning_threshold integer,
  decision text,
  allowed boolean,
  requires_approval boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_balance numeric(14, 2);
  v_existing_order_debit numeric(14, 2);
  v_ledger_exposure numeric(14, 2);
  v_unposted numeric(14, 2);
  v_used numeric(14, 2);
  v_proposed numeric(14, 2);
  v_projected numeric(14, 2);
  v_limit numeric(14, 2);
  v_policy text;
  v_threshold integer;
  v_percent numeric(8, 2);
  v_decision text;
  v_allowed boolean;
  v_requires_approval boolean;
  v_message text;
begin
  if p_customer_id is null then
    raise exception 'Customer is required.' using errcode = '22023';
  end if;
  if coalesce(p_proposed_amount, 0) < 0 then
    raise exception 'Proposed amount cannot be negative.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text, 0));

  select coalesce(sum(transaction.debit - transaction.credit), 0)
  into v_ledger_balance
  from public.account_transactions transaction
  where transaction.customer_id = p_customer_id;

  select coalesce(sum(original.debit - original.credit), 0)
  into v_existing_order_debit
  from public.account_transactions original
  where p_order_id is not null
    and original.order_id = p_order_id
    and original.customer_id = p_customer_id
    and original.type = 'ORDER'
    and original.is_reversal = false
    and not exists (
      select 1 from public.account_transactions reversal
      where reversal.reversed_transaction_id = original.id
    );

  v_ledger_exposure := greatest(round(v_ledger_balance - v_existing_order_debit, 2), 0);

  select coalesce(sum(orders.total), 0)
  into v_unposted
  from public.orders orders
  where orders.user_id = p_customer_id
    and (p_order_id is null or orders.id <> p_order_id)
    and (orders.payment_status = 'paid' or orders.status in ('confirmed', 'preparing', 'shipped', 'completed'))
    and orders.status <> 'cancelled'
    and not exists (
      select 1
      from public.account_transactions original
      where original.order_id = orders.id
        and original.customer_id = orders.user_id
        and original.type = 'ORDER'
        and original.is_reversal = false
        and not exists (
          select 1 from public.account_transactions reversal
          where reversal.reversed_transaction_id = original.id
        )
    );

  select
    coalesce(account.risk_limit, 0),
    coalesce(account.risk_policy, 'warn'),
    coalesce(account.risk_warning_threshold, 80)
  into v_limit, v_policy, v_threshold
  from public.customer_accounts account
  where account.customer_id = p_customer_id;

  if not found then
    v_limit := 0;
    v_policy := 'warn';
    v_threshold := 80;
  end if;

  v_unposted := round(v_unposted, 2);
  v_used := round(v_ledger_exposure + v_unposted, 2);
  v_proposed := round(coalesce(p_proposed_amount, 0), 2);
  v_projected := round(v_used + v_proposed, 2);
  v_percent := case when v_limit <= 0 then 0 else round((v_projected / v_limit) * 100, 2) end;

  if v_limit <= 0 then
    v_decision := 'approved'; v_allowed := true; v_requires_approval := false;
    v_message := 'Risk limiti tanımlı değil; işlem serbest.';
  elsif v_projected > v_limit and v_policy = 'block' then
    v_decision := 'blocked'; v_allowed := false; v_requires_approval := false;
    v_message := 'Risk limiti aşıldı; sipariş politikaya göre engellendi.';
  elsif v_projected > v_limit and v_policy = 'require_approval' then
    v_decision := 'approval_required'; v_allowed := true; v_requires_approval := true;
    v_message := 'Risk limiti aşıldı; yönetici onayı gerekiyor.';
  elsif v_projected > v_limit or v_percent >= v_threshold then
    v_decision := 'warning'; v_allowed := true; v_requires_approval := false;
    v_message := case when v_projected > v_limit then 'Risk limiti aşıldı; uyarı politikasıyla işleme izin verildi.' else 'Risk kullanımı uyarı eşiğine ulaştı.' end;
  else
    v_decision := 'approved'; v_allowed := true; v_requires_approval := false;
    v_message := 'Risk limiti uygun.';
  end if;

  return query select
    v_ledger_exposure, v_unposted, v_used, v_proposed, v_projected, v_limit,
    round(v_limit - v_projected, 2), v_percent, v_policy, v_threshold,
    v_decision, v_allowed, v_requires_approval, v_message;
end;
$$;

create or replace function public.assess_order_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
  v_keep_approval boolean := false;
  v_is_postable boolean;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_keep_approval := old.risk_approved_at is not null
      and new.user_id = old.user_id
      and round(new.total, 2) = round(old.total, 2);
  end if;

  select * into v_result
  from public.evaluate_customer_risk(new.user_id, greatest(new.total, 0), case when tg_op = 'UPDATE' then new.id else null end);

  new.risk_decision := v_result.decision;
  new.risk_snapshot := jsonb_build_object(
    'ledger_exposure', v_result.ledger_exposure,
    'unposted_order_exposure', v_result.unposted_order_exposure,
    'used_limit', v_result.used_limit,
    'proposed_amount', v_result.proposed_amount,
    'projected_exposure', v_result.projected_exposure,
    'risk_limit', v_result.risk_limit,
    'available_limit', v_result.available_limit,
    'usage_percent', v_result.usage_percent,
    'risk_policy', v_result.risk_policy,
    'warning_threshold', v_result.warning_threshold,
    'message', v_result.message,
    'evaluated_at', now()
  );

  if v_result.decision = 'blocked' then
    raise exception '%', v_result.message using errcode = 'P0001';
  end if;

  if v_result.decision = 'approval_required' then
    if not v_keep_approval then
      new.risk_approved_at := null;
      new.risk_approved_by := null;
    end if;
    v_is_postable := new.payment_status = 'paid' or new.status in ('confirmed', 'preparing', 'shipped', 'completed');
    if v_is_postable and new.risk_approved_at is null then
      raise exception 'Risk limiti aşıldı; sipariş yönetici onayı bekliyor.' using errcode = 'P0001';
    end if;
  else
    new.risk_approved_at := null;
    new.risk_approved_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists assess_order_risk_before_write on public.orders;
create trigger assess_order_risk_before_write
  before insert or update of user_id, total, status, payment_status on public.orders
  for each row execute function public.assess_order_risk();

create or replace function public.update_customer_risk_settings(
  p_customer_id uuid,
  p_risk_limit numeric,
  p_risk_policy text,
  p_warning_threshold integer,
  p_actor_user_id uuid default null
)
returns public.customer_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.customer_accounts%rowtype;
  v_new public.customer_accounts%rowtype;
begin
  if p_customer_id is null or p_risk_limit is null or p_risk_limit < 0 then
    raise exception 'Customer and a non-negative risk limit are required.' using errcode = '22023';
  end if;
  if p_risk_policy not in ('warn', 'require_approval', 'block') then
    raise exception 'Invalid risk policy.' using errcode = '22023';
  end if;
  if p_warning_threshold not between 1 and 100 then
    raise exception 'Warning threshold must be between 1 and 100.' using errcode = '22023';
  end if;

  select * into v_old from public.customer_accounts where customer_id = p_customer_id;

  insert into public.customer_accounts (customer_id, risk_limit, risk_policy, risk_warning_threshold)
  values (p_customer_id, round(p_risk_limit, 2), p_risk_policy, p_warning_threshold)
  on conflict (customer_id) do update set
    risk_limit = excluded.risk_limit,
    risk_policy = excluded.risk_policy,
    risk_warning_threshold = excluded.risk_warning_threshold,
    updated_at = now()
  returning * into v_new;

  insert into public.audit_logs (actor_user_id, action, resource_type, resource_id, old_value, new_value)
  values (
    p_actor_user_id, 'customer_risk_settings_updated', 'customer_account', p_customer_id::text,
    jsonb_build_object('risk_limit', v_old.risk_limit, 'risk_policy', v_old.risk_policy, 'warning_threshold', v_old.risk_warning_threshold),
    jsonb_build_object('risk_limit', v_new.risk_limit, 'risk_policy', v_new.risk_policy, 'warning_threshold', v_new.risk_warning_threshold)
  );

  return v_new;
end;
$$;

create or replace function public.approve_order_risk(
  p_order_id uuid,
  p_actor_user_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_order_id is null or p_actor_user_id is null then
    raise exception 'Order and approving manager are required.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order was not found.' using errcode = 'P0002'; end if;
  if v_order.risk_decision <> 'approval_required' then
    raise exception 'Order does not require risk approval.' using errcode = '22023';
  end if;

  update public.orders
  set risk_approved_at = now(), risk_approved_by = p_actor_user_id, updated_at = now()
  where id = p_order_id
  returning * into v_order;

  insert into public.audit_logs (actor_user_id, action, resource_type, resource_id, new_value)
  values (p_actor_user_id, 'order_risk_approved', 'order', p_order_id::text, jsonb_build_object('risk_decision', v_order.risk_decision, 'total', v_order.total));

  return v_order;
end;
$$;

create or replace view public.customer_account_summaries
with (security_invoker = true)
as
with ledger_totals as (
  select customer_id,
    coalesce(sum(debit), 0)::numeric(14, 2) as total_debit,
    coalesce(sum(credit), 0)::numeric(14, 2) as total_credit,
    coalesce(sum(debit - credit), 0)::numeric(14, 2) as balance,
    max(created_at) as last_transaction_at
  from public.account_transactions group by customer_id
),
overdue_totals as (
  select customer_id, coalesce(sum(remaining_amount), 0)::numeric(14, 2) as overdue_balance
  from public.customer_receivable_due_status
  where overdue_days > 0 and remaining_amount > 0 group by customer_id
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
  risk.risk_limit,
  risk.available_limit,
  risk.risk_exceeded,
  coalesce(ledger.last_transaction_at, account.last_transaction_at) as last_transaction_at,
  lower(concat_ws(' ', profile.full_name, profile.email, profile.phone, 'CARI-' || left(replace(profile.user_id::text, '-', ''), 8))) as search_text
from public.customer_profiles profile
left join public.customer_accounts account on account.customer_id = profile.user_id
left join ledger_totals ledger on ledger.customer_id = profile.user_id
left join overdue_totals overdue on overdue.customer_id = profile.user_id
join public.customer_risk_status risk on risk.customer_id = profile.user_id;

revoke all on public.customer_risk_status from anon, authenticated;
grant select on public.customer_risk_status to service_role;
revoke all on function public.evaluate_customer_risk(uuid, numeric, uuid) from public, anon, authenticated;
revoke all on function public.update_customer_risk_settings(uuid, numeric, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.approve_order_risk(uuid, uuid) from public, anon, authenticated;
grant execute on function public.evaluate_customer_risk(uuid, numeric, uuid) to service_role;
grant execute on function public.update_customer_risk_settings(uuid, numeric, text, integer, uuid) to service_role;
grant execute on function public.approve_order_risk(uuid, uuid) to service_role;

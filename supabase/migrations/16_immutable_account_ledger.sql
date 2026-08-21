-- ============================================================================
-- 16_immutable_account_ledger.sql
-- Atomic, idempotent and immutable customer account ledger.
-- ============================================================================

alter table public.account_transactions
  drop constraint if exists account_transactions_money_check;
alter table public.account_transactions
  add constraint account_transactions_money_check check (
    debit >= 0
    and credit >= 0
    and amount >= 0
    and (
      (debit > 0 and credit = 0)
      or (credit > 0 and debit = 0)
    )
    and amount = greatest(debit, credit)
  );

alter table public.account_transactions
  drop constraint if exists account_transactions_type_check;
alter table public.account_transactions
  add constraint account_transactions_type_check check (
    type in (
      'ORDER',
      'PAYMENT',
      'PARTIAL_PAYMENT',
      'REFUND',
      'ADJUSTMENT',
      'CANCELLATION',
      'OPENING_BALANCE'
    )
  );

alter table public.account_transactions
  drop constraint if exists account_transactions_reversal_check;
alter table public.account_transactions
  add constraint account_transactions_reversal_check check (
    is_reversal = (reversed_transaction_id is not null)
  );

create unique index if not exists idx_account_transactions_single_reversal
  on public.account_transactions (reversed_transaction_id)
  where reversed_transaction_id is not null;

create or replace function public.prevent_account_transaction_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Account ledger rows are immutable; append a reversal transaction instead.'
    using errcode = '55000';
end;
$$;

drop trigger if exists prevent_account_transaction_update on public.account_transactions;
create trigger prevent_account_transaction_update
  before update on public.account_transactions
  for each row execute function public.prevent_account_transaction_mutation();

drop trigger if exists prevent_account_transaction_delete on public.account_transactions;
create trigger prevent_account_transaction_delete
  before delete on public.account_transactions
  for each row execute function public.prevent_account_transaction_mutation();

create or replace function public.append_account_transaction(
  p_customer_id uuid,
  p_type text,
  p_debit numeric,
  p_credit numeric,
  p_order_id uuid default null,
  p_payment_id uuid default null,
  p_due_date date default null,
  p_description text default '',
  p_reference text default '',
  p_actor_user_id uuid default null,
  p_is_reversal boolean default false,
  p_reversed_transaction_id uuid default null,
  p_idempotency_key text default null
)
returns table(transaction_id uuid, resulting_balance numeric, idempotency_hit boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debit numeric(14, 2) := round(coalesce(p_debit, 0), 2);
  v_credit numeric(14, 2) := round(coalesce(p_credit, 0), 2);
  v_balance numeric(14, 2);
  v_transaction_id uuid;
  v_existing public.account_transactions%rowtype;
  v_original public.account_transactions%rowtype;
  v_created_at timestamptz := now();
begin
  if p_customer_id is null then
    raise exception 'Customer is required.' using errcode = '22023';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key is required.' using errcode = '22023';
  end if;

  if p_type not in (
    'ORDER', 'PAYMENT', 'PARTIAL_PAYMENT', 'REFUND',
    'ADJUSTMENT', 'CANCELLATION', 'OPENING_BALANCE'
  ) then
    raise exception 'Unsupported account transaction type: %', p_type using errcode = '22023';
  end if;

  if not (
    (v_debit > 0 and v_credit = 0)
    or (v_credit > 0 and v_debit = 0)
  ) then
    raise exception 'Exactly one of debit or credit must be greater than zero.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text, 0));

  select * into v_existing
  from public.account_transactions
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.customer_id <> p_customer_id
      or v_existing.type <> p_type
      or v_existing.debit <> v_debit
      or v_existing.credit <> v_credit
      or v_existing.order_id is distinct from p_order_id
      or v_existing.payment_id is distinct from p_payment_id
      or v_existing.reversed_transaction_id is distinct from p_reversed_transaction_id
    then
      raise exception 'Idempotency key is already used by a different transaction.' using errcode = '23505';
    end if;

    return query select v_existing.id, v_existing.balance_after, true;
    return;
  end if;

  if p_is_reversal <> (p_reversed_transaction_id is not null) then
    raise exception 'Reversal transactions must reference their original transaction.' using errcode = '22023';
  end if;

  if p_reversed_transaction_id is not null then
    select * into v_original
    from public.account_transactions
    where id = p_reversed_transaction_id;

    if not found or v_original.customer_id <> p_customer_id then
      raise exception 'Original account transaction was not found for this customer.' using errcode = '23503';
    end if;

    if v_original.is_reversal then
      raise exception 'A reversal transaction cannot be reversed directly.' using errcode = '22023';
    end if;
  end if;

  insert into public.customer_accounts (customer_id)
  values (p_customer_id)
  on conflict (customer_id) do nothing;

  select round(coalesce(sum(debit - credit), 0), 2)
  into v_balance
  from public.account_transactions
  where customer_id = p_customer_id;

  v_balance := round(v_balance + v_debit - v_credit, 2);

  insert into public.account_transactions (
    customer_id,
    type,
    debit,
    credit,
    amount,
    balance_after,
    order_id,
    payment_id,
    due_date,
    description,
    reference,
    actor_user_id,
    is_reversal,
    reversed_transaction_id,
    idempotency_key,
    created_at
  ) values (
    p_customer_id,
    p_type,
    v_debit,
    v_credit,
    greatest(v_debit, v_credit),
    v_balance,
    p_order_id,
    p_payment_id,
    p_due_date,
    coalesce(p_description, ''),
    coalesce(p_reference, ''),
    p_actor_user_id,
    p_is_reversal,
    p_reversed_transaction_id,
    p_idempotency_key,
    v_created_at
  )
  returning id into v_transaction_id;

  update public.customer_accounts
  set
    overdue_balance = (
      select coalesce(sum(debit - credit), 0)
      from public.account_transactions
      where customer_id = p_customer_id
        and due_date < current_date
        and debit > credit
    ),
    last_transaction_at = v_created_at,
    last_payment_at = case
      when p_type in ('PAYMENT', 'PARTIAL_PAYMENT') then v_created_at
      else last_payment_at
    end,
    updated_at = v_created_at
  where customer_id = p_customer_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    new_value,
    metadata
  ) values (
    p_actor_user_id,
    'account_transaction_created',
    'account_transaction',
    v_transaction_id::text,
    jsonb_build_object(
      'customer_id', p_customer_id,
      'type', p_type,
      'debit', v_debit,
      'credit', v_credit,
      'balance_after', v_balance,
      'is_reversal', p_is_reversal
    ),
    jsonb_build_object('idempotency_key', p_idempotency_key)
  );

  return query select v_transaction_id, v_balance, false;
end;
$$;

revoke all on function public.append_account_transaction(
  uuid, text, numeric, numeric, uuid, uuid, date, text, text, uuid, boolean, uuid, text
) from public, anon, authenticated;
grant execute on function public.append_account_transaction(
  uuid, text, numeric, numeric, uuid, uuid, date, text, text, uuid, boolean, uuid, text
) to service_role;

create or replace view public.account_transaction_ledger
with (security_invoker = true)
as
select
  transaction.id as transaction_id,
  transaction.customer_id,
  transaction.type,
  transaction.reference,
  transaction.description,
  transaction.due_date,
  transaction.debit,
  transaction.credit,
  transaction.balance_after,
  transaction.actor_user_id,
  coalesce(nullif(actor.full_name, ''), actor.email, 'Sistem') as actor_name,
  transaction.order_id,
  orders.order_number,
  transaction.payment_id,
  transaction.is_reversal,
  transaction.reversed_transaction_id,
  transaction.created_at,
  lower(concat_ws(' ', transaction.reference, transaction.description, orders.order_number)) as search_text
from public.account_transactions transaction
left join public.admin_users actor on actor.user_id = transaction.actor_user_id
left join public.orders on orders.id = transaction.order_id;

create or replace view public.customer_account_transaction_breakdown
with (security_invoker = true)
as
select
  customer_id,
  type,
  count(*)::bigint as transaction_count,
  sum(debit)::numeric(14, 2) as total_debit,
  sum(credit)::numeric(14, 2) as total_credit,
  sum(debit - credit)::numeric(14, 2) as net_balance,
  max(created_at) as last_transaction_at
from public.account_transactions
group by customer_id, type;

revoke all on public.account_transaction_ledger from anon, authenticated;
revoke all on public.customer_account_transaction_breakdown from anon, authenticated;
grant select on public.account_transaction_ledger to service_role;
grant select on public.customer_account_transaction_breakdown to service_role;

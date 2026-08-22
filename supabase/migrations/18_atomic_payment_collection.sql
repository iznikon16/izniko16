-- ============================================================================
-- 18_atomic_payment_collection.sql
-- Atomic payments, partial allocations and immutable payment reversals.
-- ============================================================================

alter table public.payments
  add column if not exists note text not null default '';

alter table public.payments
  drop constraint if exists payments_amount_check;
alter table public.payments
  add constraint payments_amount_check check (amount > 0);

alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check check (status in ('completed', 'reversed'));

alter table public.payment_allocations
  drop constraint if exists payment_allocations_amount_check;
alter table public.payment_allocations
  add constraint payment_allocations_amount_check check (allocated_amount > 0);

create unique index if not exists idx_payment_allocations_payment_order
  on public.payment_allocations (payment_id, order_id);

create or replace function public.prevent_payment_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Payments are immutable; reverse the payment instead.' using errcode = '55000';
  end if;

  if old.status = 'completed'
    and new.status = 'reversed'
    and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status')
  then
    return new;
  end if;

  raise exception 'Payments are immutable; only a completed payment can be reversed.' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_payment_update on public.payments;
create trigger prevent_payment_update
  before update on public.payments
  for each row execute function public.prevent_payment_mutation();

drop trigger if exists prevent_payment_delete on public.payments;
create trigger prevent_payment_delete
  before delete on public.payments
  for each row execute function public.prevent_payment_mutation();

create or replace function public.prevent_payment_allocation_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Payment allocations are immutable.' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_payment_allocation_update on public.payment_allocations;
create trigger prevent_payment_allocation_update
  before update on public.payment_allocations
  for each row execute function public.prevent_payment_allocation_mutation();

drop trigger if exists prevent_payment_allocation_delete on public.payment_allocations;
create trigger prevent_payment_allocation_delete
  before delete on public.payment_allocations
  for each row execute function public.prevent_payment_allocation_mutation();

create or replace function public.record_account_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_paid_at timestamptz default now(),
  p_payment_method text default 'manual',
  p_reference_number text default '',
  p_description text default '',
  p_note text default '',
  p_order_id uuid default null,
  p_provider text default 'manual',
  p_provider_reference text default null,
  p_actor_user_id uuid default null,
  p_idempotency_key text default null
)
returns table(
  payment_id uuid,
  transaction_id uuid,
  customer_id uuid,
  payment_type text,
  allocated_amount numeric,
  resulting_balance numeric,
  idempotency_hit boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(14, 2) := round(coalesce(p_amount, 0), 2);
  v_existing_payment public.payments%rowtype;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_existing_transaction public.account_transactions%rowtype;
  v_transaction_id uuid;
  v_balance numeric(14, 2);
  v_current_balance numeric(14, 2);
  v_order_outstanding numeric(14, 2);
  v_payment_type text;
begin
  if p_customer_id is null then
    raise exception 'Customer is required.' using errcode = '22023';
  end if;

  if v_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.' using errcode = '22023';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key is required.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.customer_profiles where user_id = p_customer_id) then
    raise exception 'Customer was not found.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text, 0));

  select * into v_existing_payment
  from public.payments
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_payment.customer_id <> p_customer_id
      or v_existing_payment.amount <> v_amount
      or v_existing_payment.order_id is distinct from p_order_id
      or v_existing_payment.provider <> coalesce(nullif(btrim(p_provider), ''), 'manual')
      or v_existing_payment.provider_reference is distinct from p_provider_reference
    then
      raise exception 'Idempotency key is already used by a different payment.' using errcode = '23505';
    end if;

    select * into v_existing_transaction
    from public.account_transactions
    where account_transactions.payment_id = v_existing_payment.id
      and account_transactions.is_reversal = false
      and account_transactions.type in ('PAYMENT', 'PARTIAL_PAYMENT')
    limit 1;

    if v_existing_transaction.id is null then
      raise exception 'Idempotent payment is missing its ledger transaction.' using errcode = '55000';
    end if;

    select round(coalesce(sum(debit - credit), 0), 2)
    into v_balance
    from public.account_transactions
    where account_transactions.customer_id = p_customer_id;

    return query select
      v_existing_payment.id,
      v_existing_transaction.id,
      v_existing_payment.customer_id,
      v_existing_transaction.type,
      coalesce((
        select sum(allocation.allocated_amount)
        from public.payment_allocations allocation
        where allocation.payment_id = v_existing_payment.id
      ), 0)::numeric,
      v_balance,
      true;
    return;
  end if;

  select round(coalesce(sum(debit - credit), 0), 2)
  into v_current_balance
  from public.account_transactions
  where account_transactions.customer_id = p_customer_id;

  if p_order_id is not null then
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
      raise exception 'Order was not found.' using errcode = 'P0002';
    end if;

    if v_order.user_id <> p_customer_id then
      raise exception 'Order does not belong to this customer.' using errcode = '42501';
    end if;

    if v_order.status = 'cancelled' then
      raise exception 'A cancelled order cannot receive a payment allocation.' using errcode = '22023';
    end if;

    select round(coalesce(sum(debit - credit), 0), 2)
    into v_order_outstanding
    from public.account_transactions
    where account_transactions.customer_id = p_customer_id
      and account_transactions.order_id = p_order_id;

    if v_order_outstanding <= 0 then
      raise exception 'The order has no outstanding receivable.' using errcode = '22023';
    end if;

    if v_amount > v_order_outstanding then
      raise exception 'Payment amount exceeds the order outstanding balance.' using errcode = '22023';
    end if;

    v_payment_type := case
      when v_amount < v_order_outstanding then 'PARTIAL_PAYMENT'
      else 'PAYMENT'
    end;
  else
    v_payment_type := case
      when v_current_balance > v_amount then 'PARTIAL_PAYMENT'
      else 'PAYMENT'
    end;
  end if;

  insert into public.payments (
    customer_id,
    order_id,
    amount,
    paid_at,
    payment_method,
    reference_number,
    description,
    note,
    status,
    provider,
    provider_reference,
    actor_user_id,
    idempotency_key
  ) values (
    p_customer_id,
    p_order_id,
    v_amount,
    coalesce(p_paid_at, now()),
    coalesce(nullif(btrim(p_payment_method), ''), 'manual'),
    coalesce(p_reference_number, ''),
    coalesce(p_description, ''),
    coalesce(p_note, ''),
    'completed',
    coalesce(nullif(btrim(p_provider), ''), 'manual'),
    p_provider_reference,
    p_actor_user_id,
    p_idempotency_key
  ) returning * into v_payment;

  if p_order_id is not null then
    insert into public.payment_allocations (payment_id, order_id, allocated_amount)
    values (v_payment.id, p_order_id, v_amount);
  end if;

  select result.transaction_id, result.resulting_balance
  into v_transaction_id, v_balance
  from public.append_account_transaction(
    p_customer_id => p_customer_id,
    p_type => v_payment_type,
    p_debit => 0,
    p_credit => v_amount,
    p_order_id => p_order_id,
    p_payment_id => v_payment.id,
    p_due_date => null,
    p_description => coalesce(nullif(btrim(p_description), ''), 'Tahsilat'),
    p_reference => coalesce(nullif(btrim(p_reference_number), ''), left(v_payment.id::text, 8)),
    p_actor_user_id => p_actor_user_id,
    p_is_reversal => false,
    p_reversed_transaction_id => null,
    p_idempotency_key => format('payment-ledger:%s', v_payment.id)
  ) result;

  insert into public.audit_logs (
    actor_user_id, action, resource_type, resource_id, new_value, metadata
  ) values (
    p_actor_user_id,
    'payment_collected',
    'payment',
    v_payment.id::text,
    jsonb_build_object(
      'customer_id', p_customer_id,
      'amount', v_amount,
      'order_id', p_order_id,
      'payment_type', v_payment_type,
      'resulting_balance', v_balance
    ),
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'provider', v_payment.provider,
      'provider_reference', v_payment.provider_reference
    )
  );

  return query select
    v_payment.id,
    v_transaction_id,
    v_payment.customer_id,
    v_payment_type,
    case when p_order_id is null then 0 else v_amount end,
    v_balance,
    false;
end;
$$;

create or replace function public.reverse_account_payment(
  p_payment_id uuid,
  p_actor_user_id uuid default null
)
returns table(
  payment_id uuid,
  transaction_id uuid,
  customer_id uuid,
  resulting_balance numeric,
  idempotency_hit boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_original public.account_transactions%rowtype;
  v_reversal public.account_transactions%rowtype;
  v_transaction_id uuid;
  v_balance numeric(14, 2);
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment was not found.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_payment.customer_id::text, 0));

  select * into v_original
  from public.account_transactions
  where account_transactions.payment_id = v_payment.id
    and account_transactions.type in ('PAYMENT', 'PARTIAL_PAYMENT')
    and account_transactions.is_reversal = false
  limit 1;

  if v_original.id is null then
    raise exception 'Payment ledger transaction was not found.' using errcode = '55000';
  end if;

  if v_payment.status = 'reversed' then
    select * into v_reversal
    from public.account_transactions
    where reversed_transaction_id = v_original.id
    limit 1;

    select round(coalesce(sum(debit - credit), 0), 2)
    into v_balance
    from public.account_transactions
    where account_transactions.customer_id = v_payment.customer_id;

    return query select v_payment.id, v_reversal.id, v_payment.customer_id, v_balance, true;
    return;
  end if;

  update public.payments
  set status = 'reversed'
  where id = v_payment.id;

  select result.transaction_id, result.resulting_balance
  into v_transaction_id, v_balance
  from public.append_account_transaction(
    p_customer_id => v_payment.customer_id,
    p_type => 'REFUND',
    p_debit => v_original.credit,
    p_credit => 0,
    p_order_id => v_payment.order_id,
    p_payment_id => v_payment.id,
    p_due_date => null,
    p_description => 'Tahsilat iptali - ters kayıt',
    p_reference => coalesce(nullif(v_payment.reference_number, ''), left(v_payment.id::text, 8)),
    p_actor_user_id => p_actor_user_id,
    p_is_reversal => true,
    p_reversed_transaction_id => v_original.id,
    p_idempotency_key => format('payment-reversal:%s', v_payment.id)
  ) result;

  insert into public.audit_logs (
    actor_user_id, action, resource_type, resource_id, old_value, new_value, metadata
  ) values (
    p_actor_user_id,
    'payment_reversed',
    'payment',
    v_payment.id::text,
    jsonb_build_object('status', 'completed', 'amount', v_payment.amount),
    jsonb_build_object('status', 'reversed', 'resulting_balance', v_balance),
    jsonb_build_object('reversal_transaction_id', v_transaction_id)
  );

  return query select v_payment.id, v_transaction_id, v_payment.customer_id, v_balance, false;
end;
$$;

-- Online payment success must update attempt + order, post the order debit and
-- collect/allocate the payment credit in one database transaction.
create or replace function public.record_payment_result_with_accounting(
  p_attempt_id uuid,
  p_failure_reason text,
  p_metadata jsonb,
  p_provider_reference text,
  p_paid boolean
)
returns table(
  order_id uuid,
  customer_id uuid,
  order_total numeric,
  accounting_action text,
  resulting_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_accounting record;
  v_payment record;
  v_payment_status public.payment_status;
begin
  select * into v_attempt
  from public.payment_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Payment attempt was not found.' using errcode = 'P0002';
  end if;

  select * into v_order
  from public.orders
  where id = v_attempt.order_id
  for update;

  if not found then
    raise exception 'Order was not found for payment attempt.' using errcode = 'P0002';
  end if;

  if p_paid and v_order.status = 'cancelled' then
    raise exception 'A cancelled order cannot be marked paid automatically.' using errcode = '22023';
  end if;

  if not p_paid and v_attempt.status = 'paid' then
    raise exception 'A paid payment attempt cannot be downgraded.' using errcode = '22023';
  end if;

  v_payment_status := case when p_paid then 'paid'::public.payment_status else 'failed'::public.payment_status end;

  update public.payment_attempts
  set
    failure_reason = p_failure_reason,
    metadata = coalesce(p_metadata, '{}'::jsonb),
    provider_reference = coalesce(p_provider_reference, v_attempt.provider_reference),
    status = v_payment_status
  where id = v_attempt.id;

  update public.orders
  set
    payment_reference = coalesce(p_provider_reference, v_attempt.provider_reference),
    payment_status = v_payment_status,
    status = case
      when p_paid then 'confirmed'::public.order_status
      else 'pending_payment'::public.order_status
    end
  where id = v_order.id
  returning * into v_order;

  select * into v_accounting
  from public.sync_order_accounting(v_order.id, null, null);

  if p_paid then
    select * into v_payment
    from public.record_account_payment(
      p_customer_id => v_order.user_id,
      p_amount => v_attempt.amount,
      p_paid_at => now(),
      p_payment_method => v_attempt.provider::text,
      p_reference_number => coalesce(p_provider_reference, v_attempt.provider_reference, v_attempt.id::text),
      p_description => 'Çevrim içi sipariş tahsilatı',
      p_note => '',
      p_order_id => v_order.id,
      p_provider => v_attempt.provider::text,
      p_provider_reference => coalesce(p_provider_reference, v_attempt.provider_reference),
      p_actor_user_id => null,
      p_idempotency_key => format('payment-attempt:%s', v_attempt.id)
    );
  end if;

  return query select
    v_order.id,
    v_order.user_id,
    v_order.total,
    v_accounting.accounting_action,
    case when p_paid then v_payment.resulting_balance else v_accounting.resulting_balance end;
end;
$$;

revoke all on function public.record_account_payment(
  uuid, numeric, timestamptz, text, text, text, text, uuid, text, text, uuid, text
) from public, anon, authenticated;
revoke all on function public.reverse_account_payment(uuid, uuid) from public, anon, authenticated;

grant execute on function public.record_account_payment(
  uuid, numeric, timestamptz, text, text, text, text, uuid, text, text, uuid, text
) to service_role;
grant execute on function public.reverse_account_payment(uuid, uuid) to service_role;

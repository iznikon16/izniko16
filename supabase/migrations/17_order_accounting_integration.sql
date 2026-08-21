-- ============================================================================
-- 17_order_accounting_integration.sql
-- Authoritative, atomic and idempotent Order -> Current Account integration.
-- ============================================================================

create or replace function public.sync_order_accounting(
  p_order_id uuid,
  p_due_date date default null,
  p_actor_user_id uuid default null
)
returns table(
  customer_id uuid,
  transaction_id uuid,
  resulting_balance numeric,
  accounting_action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_active_order_transaction public.account_transactions%rowtype;
  v_reversal_transaction_id uuid;
  v_previous_reversal_transaction_id uuid;
  v_transaction_id uuid;
  v_balance numeric(14, 2);
  v_idempotency_hit boolean;
  v_is_postable boolean;
begin
  if p_order_id is null then
    raise exception 'Order is required.' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order was not found.' using errcode = 'P0002';
  end if;

  -- All decisions use the authoritative order row. Neither customer nor amount
  -- is accepted from the caller.
  v_is_postable := v_order.payment_status = 'paid'
    or v_order.status in ('confirmed', 'preparing', 'shipped', 'completed');

  perform pg_advisory_xact_lock(hashtextextended(v_order.user_id::text, 0));

  select transaction.* into v_active_order_transaction
  from public.account_transactions transaction
  where transaction.order_id = v_order.id
    and transaction.customer_id = v_order.user_id
    and transaction.type = 'ORDER'
    and transaction.is_reversal = false
    and not exists (
      select 1
      from public.account_transactions reversal
      where reversal.reversed_transaction_id = transaction.id
    )
  order by transaction.created_at desc, transaction.id desc
  limit 1;

  if v_active_order_transaction.id is null then
    select reversal.id into v_previous_reversal_transaction_id
    from public.account_transactions reversal
    join public.account_transactions original
      on original.id = reversal.reversed_transaction_id
    where original.order_id = v_order.id
      and original.customer_id = v_order.user_id
      and original.type = 'ORDER'
    order by reversal.created_at desc, reversal.id desc
    limit 1;
  end if;

  select round(coalesce(sum(debit - credit), 0), 2)
  into v_balance
  from public.account_transactions
  where account_transactions.customer_id = v_order.user_id;

  if v_order.status = 'cancelled' then
    if v_active_order_transaction.id is null then
      return query select v_order.user_id, null::uuid, v_balance, 'noop'::text;
      return;
    end if;

    select result.transaction_id, result.resulting_balance
    into v_transaction_id, v_balance
    from public.append_account_transaction(
      p_customer_id => v_order.user_id,
      p_type => 'CANCELLATION',
      p_debit => 0,
      p_credit => v_active_order_transaction.debit,
      p_order_id => v_order.id,
      p_due_date => null,
      p_description => 'Sipariş iptali - ters kayıt',
      p_reference => v_order.order_number,
      p_actor_user_id => p_actor_user_id,
      p_is_reversal => true,
      p_reversed_transaction_id => v_active_order_transaction.id,
      p_idempotency_key => format('order-reversal:%s:%s', v_order.id, v_active_order_transaction.id)
    ) result;

    return query select v_order.user_id, v_transaction_id, v_balance, 'reversed'::text;
    return;
  end if;

  if not v_is_postable then
    return query select v_order.user_id, null::uuid, v_balance, 'noop'::text;
    return;
  end if;

  if v_order.total <= 0 then
    raise exception 'A postable order must have a positive total.' using errcode = '22023';
  end if;

  if v_active_order_transaction.id is not null
    and v_active_order_transaction.debit = round(v_order.total, 2)
    and v_active_order_transaction.credit = 0
  then
    return query select v_order.user_id, v_active_order_transaction.id, v_balance, 'duplicate'::text;
    return;
  end if;

  -- An already-posted order changed amount: preserve history by reversing the
  -- old debit, then append a new authoritative debit in the same transaction.
  if v_active_order_transaction.id is not null then
    select result.transaction_id, result.resulting_balance
    into v_reversal_transaction_id, v_balance
    from public.append_account_transaction(
      p_customer_id => v_order.user_id,
      p_type => 'CANCELLATION',
      p_debit => 0,
      p_credit => v_active_order_transaction.debit,
      p_order_id => v_order.id,
      p_due_date => null,
      p_description => 'Sipariş tutarı değişikliği - eski kayıt ters çevrildi',
      p_reference => v_order.order_number,
      p_actor_user_id => p_actor_user_id,
      p_is_reversal => true,
      p_reversed_transaction_id => v_active_order_transaction.id,
      p_idempotency_key => format('order-reversal:%s:%s', v_order.id, v_active_order_transaction.id)
    ) result;
  end if;

  select result.transaction_id, result.resulting_balance, result.idempotency_hit
  into v_transaction_id, v_balance, v_idempotency_hit
  from public.append_account_transaction(
    p_customer_id => v_order.user_id,
    p_type => 'ORDER',
    p_debit => v_order.total,
    p_credit => 0,
    p_order_id => v_order.id,
    p_due_date => p_due_date,
    p_description => case
      when coalesce(v_reversal_transaction_id, v_previous_reversal_transaction_id) is null then 'Sipariş cari borcu'
      else 'Sipariş tutarı değişikliği - yeni cari borcu'
    end,
    p_reference => v_order.order_number,
    p_actor_user_id => p_actor_user_id,
    p_is_reversal => false,
    p_reversed_transaction_id => null,
    p_idempotency_key => case
      when coalesce(v_reversal_transaction_id, v_previous_reversal_transaction_id) is null then format('order:%s', v_order.id)
      else format(
        'order-repost:%s:%s',
        v_order.id,
        coalesce(v_reversal_transaction_id, v_previous_reversal_transaction_id)
      )
    end
  ) result;

  return query select
    v_order.user_id,
    v_transaction_id,
    v_balance,
    case
      when v_idempotency_hit then 'duplicate'
      when coalesce(v_reversal_transaction_id, v_previous_reversal_transaction_id) is null then 'posted'
      else 'reposted'
    end::text;
end;
$$;

create or replace function public.update_order_with_accounting(
  p_order_id uuid,
  p_admin_note text,
  p_note text,
  p_payment_method_id uuid,
  p_payment_provider public.payment_provider,
  p_payment_reference text,
  p_payment_status public.payment_status,
  p_status public.order_status,
  p_actor_user_id uuid default null
)
returns table(
  order_id uuid,
  customer_id uuid,
  previous_status public.order_status,
  previous_payment_status public.payment_status,
  status public.order_status,
  payment_status public.payment_status,
  accounting_action text,
  resulting_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_previous_status public.order_status;
  v_previous_payment_status public.payment_status;
  v_accounting record;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order was not found.' using errcode = 'P0002';
  end if;

  v_previous_status := v_order.status;
  v_previous_payment_status := v_order.payment_status;

  update public.orders
  set
    admin_note = coalesce(p_admin_note, ''),
    note = coalesce(p_note, ''),
    payment_method_id = p_payment_method_id,
    payment_provider = p_payment_provider,
    payment_reference = p_payment_reference,
    payment_status = p_payment_status,
    status = p_status
  where id = p_order_id
  returning * into v_order;

  select * into v_accounting
  from public.sync_order_accounting(p_order_id, null, p_actor_user_id);

  return query select
    v_order.id,
    v_order.user_id,
    v_previous_status,
    v_previous_payment_status,
    v_order.status,
    v_order.payment_status,
    v_accounting.accounting_action,
    v_accounting.resulting_balance;
end;
$$;

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
  v_payment_status public.payment_status;
begin
  select * into v_attempt
  from public.payment_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Payment attempt was not found.' using errcode = 'P0002';
  end if;

  v_payment_status := case when p_paid then 'paid' else 'failed' end;

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
  where id = v_attempt.order_id
  returning * into v_order;

  if not found then
    raise exception 'Order was not found for payment attempt.' using errcode = 'P0002';
  end if;

  select * into v_accounting
  from public.sync_order_accounting(v_order.id, null, null);

  return query select
    v_order.id,
    v_order.user_id,
    v_order.total,
    v_accounting.accounting_action,
    v_accounting.resulting_balance;
end;
$$;

create or replace function public.cancel_order_with_accounting(
  p_order_id uuid,
  p_actor_user_id uuid default null
)
returns table(
  customer_id uuid,
  transaction_id uuid,
  resulting_balance numeric,
  accounting_action text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'cancelled'
  where id = p_order_id;

  if not found then
    raise exception 'Order was not found.' using errcode = 'P0002';
  end if;

  return query
  select * from public.sync_order_accounting(p_order_id, null, p_actor_user_id);
end;
$$;

revoke all on function public.sync_order_accounting(uuid, date, uuid) from public, anon, authenticated;
revoke all on function public.update_order_with_accounting(
  uuid, text, text, uuid, public.payment_provider, text,
  public.payment_status, public.order_status, uuid
) from public, anon, authenticated;
revoke all on function public.record_payment_result_with_accounting(
  uuid, text, jsonb, text, boolean
) from public, anon, authenticated;
revoke all on function public.cancel_order_with_accounting(uuid, uuid) from public, anon, authenticated;

grant execute on function public.sync_order_accounting(uuid, date, uuid) to service_role;
grant execute on function public.update_order_with_accounting(
  uuid, text, text, uuid, public.payment_provider, text,
  public.payment_status, public.order_status, uuid
) to service_role;
grant execute on function public.record_payment_result_with_accounting(
  uuid, text, jsonb, text, boolean
) to service_role;
grant execute on function public.cancel_order_with_accounting(uuid, uuid) to service_role;

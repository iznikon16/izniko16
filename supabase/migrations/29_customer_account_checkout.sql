-- Faz 22B: musterinin siparisi cari hesabina atomik ve idempotent yazmasi.

insert into public.payment_methods (
  code, name, description, instructions, provider, integration_type, config, sort_order, is_active
)
values (
  'cari-bakiye',
  'Cari Bakiyeden Öde',
  'Sipariş tutarı cari bakiyenize işlenir; kullanılabilir limitiniz sunucuda kontrol edilir.',
  'Sipariş onaylandığında tutar cari hesabınıza borç olarak kaydedilir. Varsa alacak bakiyeniz otomatik mahsup edilir.',
  'offline',
  'manual',
  '{"account_charge": true}'::jsonb,
  0,
  true
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  instructions = excluded.instructions,
  provider = excluded.provider,
  integration_type = excluded.integration_type,
  config = excluded.config,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create or replace function public.charge_checkout_to_account(
  p_attempt_id uuid,
  p_user_id uuid
)
returns table(
  order_id uuid,
  order_number text,
  resulting_balance numeric,
  accounting_action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_method public.payment_methods%rowtype;
  v_risk record;
  v_accounting record;
  v_item record;
begin
  if p_attempt_id is null or p_user_id is null then
    raise exception 'Cari checkout bilgisi eksik.' using errcode = '22023';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Ödeme denemesi bulunamadı.' using errcode = 'P0002';
  end if;

  select * into v_order
  from public.orders
  where id = v_attempt.order_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Sipariş bulunamadı veya hesaba ait değil.' using errcode = 'P0002';
  end if;

  select * into v_method
  from public.payment_methods
  where id = v_attempt.payment_method_id and code = 'cari-bakiye' and is_active = true;

  if not found then
    raise exception 'Cari bakiyeden ödeme yöntemi geçerli değil.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into v_risk
  from public.evaluate_customer_risk(p_user_id, v_order.total, v_order.id);

  if not v_risk.allowed then
    raise exception '%', v_risk.message using errcode = 'P0001';
  end if;

  if v_risk.requires_approval then
    raise exception 'Cari limit işlemi yönetici onayı gerektiriyor; doğrudan cari ödeme kullanılamaz.' using errcode = 'P0001';
  end if;

  update public.orders
  set
    status = 'confirmed',
    payment_status = 'pending',
    payment_reference = coalesce(nullif(payment_reference, ''), 'CARI-' || order_number)
  where id = v_order.id
  returning * into v_order;

  update public.payment_attempts
  set
    status = 'pending',
    provider_reference = coalesce(nullif(provider_reference, ''), 'CARI-' || v_order.order_number),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'account_charge', true,
      'account_charged_at', now(),
      'risk_decision', v_risk.decision,
      'available_limit_before', v_risk.available_limit
    )
  where id = v_attempt.id;

  select * into v_accounting
  from public.sync_order_accounting(v_order.id, null, p_user_id);

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_items.order_id = v_order.id and product_id is not null
  loop
    perform public.apply_stock_change(
      p_product_id => v_item.product_id,
      p_quantity_change => -greatest(v_item.quantity, 0),
      p_type => 'order_out',
      p_reference => v_order.order_number,
      p_order_id => v_order.id,
      p_actor_user_id => p_user_id,
      p_idempotency_key => format('order-stock:%s:%s', v_order.id, v_item.product_id)
    );
  end loop;

  return query select
    v_order.id,
    v_order.order_number,
    v_accounting.resulting_balance,
    v_accounting.accounting_action;
end;
$$;

create or replace function public.create_account_storefront_checkout(
  p_user_id uuid,
  p_idempotency_key text,
  p_payment_method_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_note text,
  p_items jsonb,
  p_discount_total numeric default 0,
  p_coupon_id uuid default null,
  p_coupon_code text default null,
  p_payment_metadata jsonb default '{}'::jsonb
)
returns table(order_id uuid, order_number text, payment_attempt_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkout record;
begin
  select * into v_checkout
  from public.create_storefront_checkout(
    p_user_id,
    p_idempotency_key,
    p_payment_method_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_address,
    p_billing_address,
    p_note,
    p_items,
    p_discount_total,
    p_coupon_id,
    p_coupon_code,
    coalesce(p_payment_metadata, '{}'::jsonb) || '{"account_charge": true}'::jsonb
  );

  perform public.charge_checkout_to_account(v_checkout.payment_attempt_id, p_user_id);

  return query select v_checkout.order_id, v_checkout.order_number, v_checkout.payment_attempt_id;
end;
$$;

revoke all on function public.charge_checkout_to_account(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_account_storefront_checkout(
  uuid, text, uuid, text, text, text, jsonb, jsonb, text, jsonb, numeric, uuid, text, jsonb
) from public, anon, authenticated;

grant execute on function public.charge_checkout_to_account(uuid, uuid) to service_role;
grant execute on function public.create_account_storefront_checkout(
  uuid, text, uuid, text, text, text, jsonb, jsonb, text, jsonb, numeric, uuid, text, jsonb
) to service_role;

-- Atomic storefront checkout. Only trusted server code may execute this RPC.
alter table public.orders
  add column if not exists checkout_idempotency_key text;

create unique index if not exists idx_orders_customer_checkout_idempotency
  on public.orders (user_id, checkout_idempotency_key)
  where checkout_idempotency_key is not null;

create or replace function public.create_storefront_checkout(
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
  v_method public.payment_methods%rowtype;
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_subtotal numeric(14,2);
  v_total numeric(14,2);
  v_coupon_updated uuid;
begin
  if not public.is_customer_active(p_user_id) then
    raise exception 'Aktif ve doğrulanmış müşteri hesabı gerekli.' using errcode = 'P0001';
  end if;

  p_idempotency_key := trim(coalesce(p_idempotency_key, ''));
  if length(p_idempotency_key) < 16 or length(p_idempotency_key) > 120 then
    raise exception 'Geçersiz checkout işlem anahtarı.' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where user_id = p_user_id
    and checkout_idempotency_key = p_idempotency_key;

  if found then
    select * into v_attempt
    from public.payment_attempts as pa
    where pa.order_id = v_order.id
    order by pa.created_at desc
    limit 1;

    if v_attempt.id is null then
      raise exception 'Mevcut checkout ödeme kaydı bulunamadı.' using errcode = 'P0001';
    end if;

    return query select v_order.id, v_order.order_number, v_attempt.id;
    return;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sipariş kalemleri boş olamaz.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'Sipariş en fazla 100 kalem içerebilir.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(
      product_id uuid,
      product_title text,
      product_slug text,
      product_image_url text,
      unit_price numeric,
      quantity integer,
      line_total numeric
    )
    where item.product_id is null
       or coalesce(item.product_title, '') = ''
       or item.unit_price < 0
       or item.quantity < 1
       or item.quantity > 99
       or round(item.line_total, 2) <> round(item.unit_price * item.quantity, 2)
  ) then
    raise exception 'Geçersiz sipariş kalemi.' using errcode = '22023';
  end if;

  select * into v_method
  from public.payment_methods
  where id = p_payment_method_id and is_active = true
  for share;

  if not found then
    raise exception 'Geçerli bir ödeme yöntemi seçin.' using errcode = 'P0001';
  end if;

  select round(sum(item.line_total), 2)
  into v_subtotal
  from jsonb_to_recordset(p_items) as item(line_total numeric);

  v_subtotal := coalesce(v_subtotal, 0);
  p_discount_total := round(greatest(coalesce(p_discount_total, 0), 0), 2);

  if p_discount_total > v_subtotal then
    raise exception 'İndirim tutarı ara toplamı aşamaz.' using errcode = '22023';
  end if;

  v_total := round(v_subtotal - p_discount_total, 2);

  if p_coupon_id is not null then
    update public.coupons
    set usage_count = usage_count + 1,
        updated_at = now()
    where id = p_coupon_id
      and upper(code) = upper(coalesce(p_coupon_code, ''))
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (usage_limit is null or usage_count < usage_limit)
    returning id into v_coupon_updated;

    if v_coupon_updated is null then
      raise exception 'Kupon artık kullanılamıyor.' using errcode = 'P0001';
    end if;
  elsif p_discount_total > 0 then
    raise exception 'Kuponsuz indirim uygulanamaz.' using errcode = '22023';
  end if;

  insert into public.orders (
    order_number,
    user_id,
    checkout_idempotency_key,
    status,
    payment_status,
    payment_method_id,
    payment_provider,
    currency,
    subtotal,
    discount_total,
    total,
    coupon_id,
    coupon_code,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    billing_address,
    note
  ) values (
    public.generate_order_number(),
    p_user_id,
    p_idempotency_key,
    'pending_payment',
    'pending',
    v_method.id,
    v_method.provider,
    'TRY',
    v_subtotal,
    p_discount_total,
    v_total,
    p_coupon_id,
    p_coupon_code,
    left(trim(p_customer_name), 200),
    left(lower(trim(p_customer_email)), 320),
    left(trim(p_customer_phone), 40),
    coalesce(p_shipping_address, '{}'::jsonb),
    coalesce(p_billing_address, '{}'::jsonb),
    left(coalesce(p_note, ''), 2000)
  ) returning * into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    product_title,
    product_slug,
    product_image_url,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order.id,
    item.product_id,
    left(item.product_title, 500),
    left(coalesce(item.product_slug, ''), 500),
    left(coalesce(item.product_image_url, ''), 2000),
    round(item.unit_price, 2),
    item.quantity,
    round(item.line_total, 2)
  from jsonb_to_recordset(p_items) as item(
    product_id uuid,
    product_title text,
    product_slug text,
    product_image_url text,
    unit_price numeric,
    quantity integer,
    line_total numeric
  );

  insert into public.payment_attempts (
    order_id,
    user_id,
    payment_method_id,
    provider,
    status,
    amount,
    currency,
    metadata
  ) values (
    v_order.id,
    p_user_id,
    v_method.id,
    v_method.provider,
    'pending',
    v_total,
    'TRY',
    coalesce(p_payment_metadata, '{}'::jsonb)
  ) returning * into v_attempt;

  delete from public.cart_items where user_id = p_user_id;

  return query select v_order.id, v_order.order_number, v_attempt.id;
end;
$$;

revoke all on function public.create_storefront_checkout(
  uuid, text, uuid, text, text, text, jsonb, jsonb, text, jsonb, numeric, uuid, text, jsonb
) from public, anon, authenticated;

grant execute on function public.create_storefront_checkout(
  uuid, text, uuid, text, text, text, jsonb, jsonb, text, jsonb, numeric, uuid, text, jsonb
) to service_role;

begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select ok(
  not has_function_privilege('anon', 'public.create_storefront_checkout(uuid,text,uuid,text,text,text,jsonb,jsonb,text,jsonb,numeric,uuid,text,jsonb)', 'EXECUTE'),
  'anonymous role cannot execute checkout RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.create_storefront_checkout(uuid,text,uuid,text,text,text,jsonb,jsonb,text,jsonb,numeric,uuid,text,jsonb)', 'EXECUTE'),
  'authenticated role cannot execute checkout RPC directly'
);
select ok(
  has_function_privilege('service_role', 'public.create_storefront_checkout(uuid,text,uuid,text,text,text,jsonb,jsonb,text,jsonb,numeric,uuid,text,jsonb)', 'EXECUTE'),
  'service role can execute checkout RPC'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '26000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'checkout@example.test', '',
  now(), '{}'::jsonb, '{"app_email_verified":true}'::jsonb, now(), now()
);

insert into public.customer_profiles (user_id, email, full_name, phone, email_verified_at)
values ('26000000-0000-0000-0000-000000000001', 'checkout@example.test', 'Checkout Customer', '5551112233', now())
on conflict (user_id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  phone = excluded.phone,
  email_verified_at = excluded.email_verified_at;

insert into public.products (id, sku, slug, title, price, price_mode, status, is_active, stock_quantity, minimum_order_quantity, tax_rate)
values ('26000000-0000-0000-0000-000000000010', 'CHECKOUT-1', 'checkout-product', 'Checkout Product', 125, 'fixed', 'published', true, 20, 1, 20);

insert into public.payment_methods (id, code, name, provider, integration_type, is_active)
values ('26000000-0000-0000-0000-000000000020', 'checkout-bank', 'Checkout Bank', 'offline', 'manual', true);

insert into public.cart_items (user_id, product_id, quantity)
values ('26000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000010', 2);

create temporary table checkout_result as
select * from public.create_storefront_checkout(
  p_user_id => '26000000-0000-0000-0000-000000000001',
  p_idempotency_key => 'checkout-test-key-0001',
  p_payment_method_id => '26000000-0000-0000-0000-000000000020',
  p_customer_name => 'Checkout Customer',
  p_customer_email => 'checkout@example.test',
  p_customer_phone => '5551112233',
  p_shipping_address => '{"city":"Bursa","district":"İznik","address_line":"Test adresi"}'::jsonb,
  p_billing_address => '{"city":"Bursa","district":"İznik","address_line":"Test adresi"}'::jsonb,
  p_note => 'Atomic checkout test',
  p_items => '[{"product_id":"26000000-0000-0000-0000-000000000010","product_title":"Checkout Product","product_slug":"checkout-product","product_image_url":"","unit_price":125,"quantity":2,"line_total":250}]'::jsonb
);

select is((select count(*) from checkout_result), 1::bigint, 'checkout returns one result');
select ok((select order_number from checkout_result) like 'SP-%', 'checkout generates an order number');
select is((select count(*) from public.orders where id = (select order_id from checkout_result)), 1::bigint, 'checkout creates the order');
select is((select subtotal from public.orders where id = (select order_id from checkout_result)), 250.00::numeric, 'subtotal is derived from items');
select is((select total from public.orders where id = (select order_id from checkout_result)), 250.00::numeric, 'total is authoritative');
select is((select count(*) from public.order_items where order_id = (select order_id from checkout_result)), 1::bigint, 'checkout creates order items');
select is((select amount from public.payment_attempts where id = (select payment_attempt_id from checkout_result)), 250.00::numeric, 'checkout creates matching payment attempt');
select is((select count(*) from public.cart_items where user_id = '26000000-0000-0000-0000-000000000001'), 0::bigint, 'checkout clears persisted cart atomically');

select is(
  (select order_id from public.create_storefront_checkout(
    p_user_id => '26000000-0000-0000-0000-000000000001',
    p_idempotency_key => 'checkout-test-key-0001',
    p_payment_method_id => '26000000-0000-0000-0000-000000000020',
    p_customer_name => 'Checkout Customer',
    p_customer_email => 'checkout@example.test',
    p_customer_phone => '5551112233',
    p_shipping_address => '{}'::jsonb,
    p_billing_address => '{}'::jsonb,
    p_note => '',
    p_items => '[{"product_id":"26000000-0000-0000-0000-000000000010","product_title":"Checkout Product","unit_price":125,"quantity":2,"line_total":250}]'::jsonb
  )),
  (select order_id from checkout_result),
  'repeated checkout key returns the existing order'
);

select throws_ok(
  $$select * from public.create_storefront_checkout(
    '26000000-0000-0000-0000-000000000001',
    'checkout-test-key-0002',
    '26000000-0000-0000-0000-000000000020',
    'Checkout Customer', 'checkout@example.test', '5551112233', '{}'::jsonb, '{}'::jsonb, '',
    '[{"product_id":"26000000-0000-0000-0000-000000000010","product_title":"Invalid","unit_price":10,"quantity":2,"line_total":99}]'::jsonb
  )$$,
  '22023',
  'Geçersiz sipariş kalemi.',
  'checkout rejects manipulated line totals'
);

select is(
  (select count(*) from public.orders where user_id = '26000000-0000-0000-0000-000000000001'),
  1::bigint,
  'failed checkout leaves no partial order'
);

select * from finish();
rollback;

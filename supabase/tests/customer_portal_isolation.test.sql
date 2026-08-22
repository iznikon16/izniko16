begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'portal-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'portal-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.customer_profiles (user_id, email, full_name, email_verified_at) values
  ('14000000-0000-0000-0000-000000000001', 'portal-a@example.test', 'Portal Customer A', now()),
  ('14000000-0000-0000-0000-000000000002', 'portal-b@example.test', 'Portal Customer B', now())
on conflict (user_id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  email_verified_at = excluded.email_verified_at;

insert into public.products (id, sku, slug, title, price, status, is_active, stock_quantity, minimum_order_quantity, tax_rate)
values ('14000000-0000-0000-0000-000000000010', 'PORTAL-TEST', 'portal-test-product', 'Portal Test Product', 10, 'published', true, 10, 1, 20);

insert into public.customer_addresses (user_id, label) values
  ('14000000-0000-0000-0000-000000000001', 'A Address'),
  ('14000000-0000-0000-0000-000000000002', 'B Address');

insert into public.customer_favorites (user_id, product_id) values
  ('14000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000010'),
  ('14000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000010');

insert into public.cart_items (user_id, product_id, quantity) values
  ('14000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000010', 1),
  ('14000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000010', 2);

select * from public.append_account_transaction('14000000-0000-0000-0000-000000000001', 'ADJUSTMENT', 100, 0, null, null, null, 'A debt', 'A-REF', null, false, null, 'portal-a-debt');
select * from public.append_account_transaction('14000000-0000-0000-0000-000000000002', 'ADJUSTMENT', 200, 0, null, null, null, 'B debt', 'B-REF', null, false, null, 'portal-b-debt');
select * from public.record_account_payment(p_customer_id => '14000000-0000-0000-0000-000000000001', p_amount => 25, p_idempotency_key => 'portal-a-payment');
select * from public.record_account_payment(p_customer_id => '14000000-0000-0000-0000-000000000002', p_amount => 50, p_idempotency_key => 'portal-b-payment');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.customer_accounts), 1::bigint, 'customer sees only own account');
select is((select customer_id from public.customer_accounts), '14000000-0000-0000-0000-000000000001'::uuid, 'visible account belongs to authenticated customer');
select is((select count(*) from public.account_transactions), 2::bigint, 'customer sees only own ledger rows');
select is((select count(*) from public.account_transactions where customer_id = '14000000-0000-0000-0000-000000000002'), 0::bigint, 'other customer ledger is isolated');
select is((select count(*) from public.payments), 1::bigint, 'customer sees only own payment');
select is((select count(*) from public.payments where customer_id = '14000000-0000-0000-0000-000000000002'), 0::bigint, 'other customer payment is isolated');
select is((select count(*) from public.customer_addresses), 1::bigint, 'customer sees only own address');
select is((select count(*) from public.customer_favorites), 1::bigint, 'customer sees only own favorites');
select is((select count(*) from public.cart_items), 1::bigint, 'customer sees only own cart');

reset role;
update public.customer_profiles set is_blocked = true where user_id = '14000000-0000-0000-0000-000000000001';
set local role authenticated;

select is((select count(*) from public.customer_accounts), 0::bigint, 'blocked customer cannot read own account');
select is((select count(*) from public.account_transactions), 0::bigint, 'blocked customer cannot read own ledger');
select is((select count(*) from public.customer_addresses), 0::bigint, 'blocked customer cannot read own address');
select is((select count(*) from public.customer_favorites), 0::bigint, 'blocked customer cannot read own favorites');
select is((select count(*) from public.cart_items), 0::bigint, 'blocked customer cannot read own cart');

reset role;
update public.customer_profiles
set is_blocked = false, email_verified_at = null
where user_id = '14000000-0000-0000-0000-000000000001';
set local role authenticated;

select is((select count(*) from public.customer_accounts), 0::bigint, 'unverified customer cannot read own account');
select is((select count(*) from public.customer_addresses), 0::bigint, 'unverified customer cannot read own address');
select is((select count(*) from public.cart_items), 0::bigint, 'unverified customer cannot read own cart');

select * from finish();
rollback;

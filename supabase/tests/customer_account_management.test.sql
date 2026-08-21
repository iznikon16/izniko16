begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select ok(not has_function_privilege('anon', 'public.save_customer_address(uuid,text,text,text,text,text,text,text,text,boolean)', 'EXECUTE'), 'anonymous cannot save addresses');
select ok(has_function_privilege('authenticated', 'public.save_customer_address(uuid,text,text,text,text,text,text,text,text,boolean)', 'EXECUTE'), 'authenticated customer can execute address save RPC');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('27000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'account-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('27000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'account-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.customer_profiles (user_id, email, full_name, email_verified_at) values
  ('27000000-0000-0000-0000-000000000001', 'account-a@example.test', 'Account A', now()),
  ('27000000-0000-0000-0000-000000000002', 'account-b@example.test', 'Account B', now())
on conflict (user_id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  email_verified_at = excluded.email_verified_at;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"27000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.save_customer_address(null, 'İş', 'Account A', '5551112233', 'Bursa', 'İznik', 'Merkez', 'Test 1', '16860', false)$$,
  'first address can be saved'
);
select is((select count(*) from public.customer_addresses), 1::bigint, 'first address is visible');
select is((select count(*) from public.customer_addresses where is_default), 1::bigint, 'first address automatically becomes default');

select lives_ok(
  $$select public.save_customer_address(null, 'Depo', 'Account A', '5551112233', 'Bursa', 'Orhangazi', '', 'Test 2', '', true)$$,
  'second address can be saved as default'
);
select is((select count(*) from public.customer_addresses where is_default), 1::bigint, 'only one default address remains');
select is((select label from public.customer_addresses where is_default), 'Depo', 'requested address becomes default');

select ok(public.delete_customer_address((select id from public.customer_addresses where is_default)), 'default address can be deleted');
select is((select count(*) from public.customer_addresses), 1::bigint, 'one address remains after delete');
select is((select count(*) from public.customer_addresses where is_default), 1::bigint, 'remaining address is promoted to default');

reset role;
insert into public.customer_addresses (user_id, label, is_default)
values ('27000000-0000-0000-0000-000000000002', 'Other customer', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"27000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select ok(not public.set_default_customer_address((select id from public.customer_addresses where label = 'Other customer')), 'customer cannot change another customer address');
select is((select count(*) from public.customer_addresses), 1::bigint, 'other customer address stays hidden by RLS');

select * from finish();
rollback;

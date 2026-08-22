begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '47000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'global-search@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.customer_profiles (user_id, email, full_name)
values ('47000000-0000-4000-8000-000000000001', 'global-search@example.test', 'Global Search Customer')
on conflict (user_id) do update set
  email = excluded.email,
  full_name = excluded.full_name;

insert into public.account_transactions (
  id, customer_id, type, debit, amount, balance_after, description, reference, idempotency_key
) values (
  '47000000-1234-4000-8000-000000000002',
  '47000000-0000-4000-8000-000000000001',
  'ADJUSTMENT', 25, 25, 25, 'Arama testi', 'GLOBAL-REFERENCE', 'global-search:test'
);

select ok(
  exists(select 1 from public.account_transaction_ledger where search_text like '%chr-47000000%'),
  'ledger search text contains the displayed cari transaction number'
);

select ok(
  exists(select 1 from public.account_transaction_ledger where search_text like '%global-reference%'),
  'ledger search text preserves business references'
);

select ok(
  not has_table_privilege('authenticated', 'public.account_transaction_ledger', 'SELECT'),
  'authenticated storefront users cannot query the admin ledger search view'
);

select * from finish();
rollback;

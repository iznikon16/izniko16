begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase6@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.customer_profiles (user_id, email, full_name)
values ('10000000-0000-0000-0000-000000000001', 'phase6@example.test', 'Phase 6 Customer')
on conflict (user_id) do update set email = excluded.email;

insert into public.orders (id, order_number, user_id, status, total)
values (
  '20000000-0000-0000-0000-000000000001',
  'PHASE6-ORDER-1',
  '10000000-0000-0000-0000-000000000001',
  'confirmed',
  100
);

select is(
  (select accounting_action from public.sync_order_accounting('20000000-0000-0000-0000-000000000001')),
  'posted',
  'confirmed order creates a debit'
);

select is(
  (select debit from public.account_transactions where order_id = '20000000-0000-0000-0000-000000000001' and type = 'ORDER'),
  100.00::numeric,
  'posted debit uses authoritative order total'
);

select is(
  (select customer_id from public.account_transactions where order_id = '20000000-0000-0000-0000-000000000001' and type = 'ORDER'),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'posted debit uses authoritative order owner'
);

select is(
  (select accounting_action from public.sync_order_accounting('20000000-0000-0000-0000-000000000001')),
  'duplicate',
  'duplicate order event is idempotent'
);

select is(
  (select count(*) from public.account_transactions where order_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'duplicate event does not append a row'
);

update public.orders
set total = 150
where id = '20000000-0000-0000-0000-000000000001';

select is(
  (select accounting_action from public.sync_order_accounting('20000000-0000-0000-0000-000000000001')),
  'reposted',
  'amount change reverses and reposts'
);

select is(
  (select count(*) from public.account_transactions where order_id = '20000000-0000-0000-0000-000000000001'),
  3::bigint,
  'amount change preserves old entry and appends two rows'
);

select is(
  (select round(sum(debit - credit), 2) from public.account_transactions where order_id = '20000000-0000-0000-0000-000000000001'),
  150.00::numeric,
  'amount change produces the new net balance'
);

select is(
  (select accounting_action from public.cancel_order_with_accounting('20000000-0000-0000-0000-000000000001')),
  'reversed',
  'cancellation appends a reversal'
);

select is(
  (select status::text from public.orders where id = '20000000-0000-0000-0000-000000000001'),
  'cancelled',
  'cancellation updates order status atomically'
);

select is(
  (select round(sum(debit - credit), 2) from public.account_transactions where order_id = '20000000-0000-0000-0000-000000000001'),
  0.00::numeric,
  'cancellation restores the order balance'
);

select is(
  (select accounting_action from public.cancel_order_with_accounting('20000000-0000-0000-0000-000000000001')),
  'noop',
  'duplicate cancellation is idempotent'
);

insert into public.orders (id, order_number, user_id, status, total)
values (
  '20000000-0000-0000-0000-000000000002',
  'PHASE6-ORDER-2',
  '10000000-0000-0000-0000-000000000001',
  'pending_payment',
  0
);

select throws_ok(
  $$
    select * from public.update_order_with_accounting(
      '20000000-0000-0000-0000-000000000002', '', '', null,
      'offline', null, 'pending', 'confirmed', null
    )
  $$,
  '22023',
  'A postable order must have a positive total.',
  'ledger failure aborts the order status update'
);

select is(
  (select status::text from public.orders where id = '20000000-0000-0000-0000-000000000002'),
  'pending_payment',
  'failed accounting rolls back the order update'
);

insert into public.orders (id, order_number, user_id, status, total)
values (
  '20000000-0000-0000-0000-000000000003',
  'PHASE6-ORDER-3',
  '10000000-0000-0000-0000-000000000001',
  'pending_payment',
  200
);

insert into public.payment_attempts (id, order_id, user_id, provider, amount)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'offline',
  200
);

select is(
  (select accounting_action from public.record_payment_result_with_accounting(
    '30000000-0000-0000-0000-000000000001', null, '{"verified":true}'::jsonb, 'PHASE6-PAYMENT', true
  )),
  'posted',
  'successful payment result posts the order in the same transaction'
);

select is(
  (select status::text from public.payment_attempts where id = '30000000-0000-0000-0000-000000000001'),
  'paid',
  'payment attempt is marked paid'
);

select is(
  (select status::text || ':' || payment_status::text from public.orders where id = '20000000-0000-0000-0000-000000000003'),
  'confirmed:paid',
  'order and payment status are updated atomically with its debit'
);

select * from finish();
rollback;

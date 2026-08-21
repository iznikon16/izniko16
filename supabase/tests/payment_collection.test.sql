begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '11000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase7@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.customer_profiles (user_id, email, full_name)
values ('11000000-0000-0000-0000-000000000001', 'phase7@example.test', 'Phase 7 Customer')
on conflict (user_id) do update set email = excluded.email;

insert into public.orders (id, order_number, user_id, status, total)
values (
  '21000000-0000-0000-0000-000000000001',
  'PHASE7-ORDER-1',
  '11000000-0000-0000-0000-000000000001',
  'confirmed',
  1000
);

select * from public.sync_order_accounting('21000000-0000-0000-0000-000000000001');

select is(
  (select payment_type from public.record_account_payment(
    p_customer_id => '11000000-0000-0000-0000-000000000001',
    p_amount => 400,
    p_payment_method => 'Havale / EFT',
    p_reference_number => 'PARTIAL-400',
    p_description => 'Kısmi ödeme',
    p_note => 'Test notu',
    p_order_id => '21000000-0000-0000-0000-000000000001',
    p_idempotency_key => 'phase7-payment-1'
  )),
  'PARTIAL_PAYMENT',
  'partial collection creates PARTIAL_PAYMENT ledger type'
);

select is(
  (select allocated_amount from public.record_account_payment(
    p_customer_id => '11000000-0000-0000-0000-000000000001',
    p_amount => 400,
    p_payment_method => 'Havale / EFT',
    p_reference_number => 'PARTIAL-400',
    p_description => 'Kısmi ödeme',
    p_note => 'Test notu',
    p_order_id => '21000000-0000-0000-0000-000000000001',
    p_idempotency_key => 'phase7-payment-1'
  )),
  400.00::numeric,
  'linked payment reports its allocated amount'
);

select is(
  (select note from public.payments where idempotency_key = 'phase7-payment-1'),
  'Test notu',
  'payment note is preserved'
);

select is(
  (select allocated_amount from public.payment_allocations allocation join public.payments payment on payment.id = allocation.payment_id where payment.idempotency_key = 'phase7-payment-1'),
  400.00::numeric,
  'partial payment creates an allocation row'
);

select is(
  (select round(sum(debit - credit), 2) from public.account_transactions where customer_id = '11000000-0000-0000-0000-000000000001'),
  600.00::numeric,
  '1000 debt minus 400 collection leaves 600 balance'
);

select is(
  (select type from public.account_transactions transaction join public.payments payment on payment.id = transaction.payment_id where payment.idempotency_key = 'phase7-payment-1' and not transaction.is_reversal),
  'PARTIAL_PAYMENT',
  'partial payment ledger row is linked to the payment'
);

select ok(
  (select idempotency_hit from public.record_account_payment(
    p_customer_id => '11000000-0000-0000-0000-000000000001',
    p_amount => 400,
    p_payment_method => 'Havale / EFT',
    p_reference_number => 'PARTIAL-400',
    p_description => 'Kısmi ödeme',
    p_note => 'Test notu',
    p_order_id => '21000000-0000-0000-0000-000000000001',
    p_idempotency_key => 'phase7-payment-1'
  )),
  'duplicate collection reports an idempotency hit'
);

select is(
  (select count(*) from public.payments where order_id = '21000000-0000-0000-0000-000000000001'),
  1::bigint,
  'duplicate collection does not create another payment'
);

select throws_ok(
  $$
    select * from public.record_account_payment(
      p_customer_id => '11000000-0000-0000-0000-000000000001',
      p_amount => 700,
      p_order_id => '21000000-0000-0000-0000-000000000001',
      p_idempotency_key => 'phase7-overpayment'
    )
  $$,
  '22023',
  'Payment amount exceeds the order outstanding balance.',
  'payment cannot exceed linked order outstanding balance'
);

select is(
  (select count(*) from public.payments where order_id = '21000000-0000-0000-0000-000000000001'),
  1::bigint,
  'rejected overpayment leaves no partial records'
);

select is(
  (select payment_type from public.record_account_payment(
    p_customer_id => '11000000-0000-0000-0000-000000000001',
    p_amount => 600,
    p_payment_method => 'Nakit',
    p_order_id => '21000000-0000-0000-0000-000000000001',
    p_idempotency_key => 'phase7-payment-2'
  )),
  'PAYMENT',
  'final collection creates PAYMENT ledger type'
);

select is(
  (select round(sum(debit - credit), 2) from public.account_transactions where customer_id = '11000000-0000-0000-0000-000000000001'),
  0.00::numeric,
  'full collection closes customer balance'
);

select is(
  (select sum(allocated_amount) from public.payment_allocations where order_id = '21000000-0000-0000-0000-000000000001'),
  1000.00::numeric,
  'allocations track the fully paid order total'
);

select ok(
  not (select idempotency_hit from public.reverse_account_payment(
    (select id from public.payments where idempotency_key = 'phase7-payment-1')
  )),
  'first payment reversal is applied'
);

select is(
  (select status from public.payments where idempotency_key = 'phase7-payment-1'),
  'reversed',
  'reversed payment status is retained'
);

select is(
  (select round(sum(debit - credit), 2) from public.account_transactions where customer_id = '11000000-0000-0000-0000-000000000001'),
  400.00::numeric,
  'payment reversal restores the customer debt'
);

select is(
  (select count(*) from public.account_transactions reversal join public.account_transactions original on original.id = reversal.reversed_transaction_id join public.payments payment on payment.id = original.payment_id where payment.idempotency_key = 'phase7-payment-1' and reversal.type = 'REFUND'),
  1::bigint,
  'payment reversal links REFUND to original ledger row'
);

select is(
  (select count(*) from public.payment_allocations where order_id = '21000000-0000-0000-0000-000000000001'),
  2::bigint,
  'reversal preserves immutable allocation history'
);

select ok(
  (select idempotency_hit from public.reverse_account_payment(
    (select id from public.payments where idempotency_key = 'phase7-payment-1')
  )),
  'duplicate payment reversal is idempotent'
);

select is(
  (select count(*) from public.account_transactions where type = 'REFUND' and payment_id = (select id from public.payments where idempotency_key = 'phase7-payment-1')),
  1::bigint,
  'duplicate reversal does not append another REFUND'
);

select throws_ok(
  $$delete from public.payments where idempotency_key = 'phase7-payment-1'$$,
  '55000',
  'Payments are immutable; reverse the payment instead.',
  'payments cannot be physically deleted'
);

insert into public.orders (id, order_number, user_id, status, total)
values (
  '21000000-0000-0000-0000-000000000002',
  'PHASE7-ORDER-2',
  '11000000-0000-0000-0000-000000000001',
  'pending_payment',
  250
);

insert into public.payment_attempts (id, order_id, user_id, provider, amount)
values (
  '31000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000001',
  'offline',
  250
);

select is(
  (select accounting_action from public.record_payment_result_with_accounting(
    '31000000-0000-0000-0000-000000000001', null, '{"verified":true}'::jsonb, 'ONLINE-250', true
  )),
  'posted',
  'online payment posts order debit atomically'
);

select is(
  (select count(*) from public.payments where order_id = '21000000-0000-0000-0000-000000000002' and status = 'completed'),
  1::bigint,
  'online payment creates exactly one completed collection'
);

select is(
  (select allocated_amount from public.payment_allocations where order_id = '21000000-0000-0000-0000-000000000002'),
  250.00::numeric,
  'online payment is allocated to its order'
);

select is(
  (select round(sum(debit - credit), 2) from public.account_transactions where order_id = '21000000-0000-0000-0000-000000000002'),
  0.00::numeric,
  'online order debit and payment credit net to zero'
);

select * from finish();
rollback;

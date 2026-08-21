begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '12000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase8@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.customer_profiles (user_id, email, full_name)
values ('12000000-0000-0000-0000-000000000001', 'phase8@example.test', 'Phase 8 Customer')
on conflict (user_id) do update set email = excluded.email;

select is(
  public.update_customer_payment_terms('12000000-0000-0000-0000-000000000001', 30),
  30,
  'customer payment term can be configured'
);

select is(
  (select payment_term_days from public.customer_accounts where customer_id = '12000000-0000-0000-0000-000000000001'),
  30,
  'payment term is stored on the customer account'
);

select is(
  (select count(*) from public.audit_logs where action = 'customer_payment_terms_updated' and resource_id = '12000000-0000-0000-0000-000000000001'),
  1::bigint,
  'payment term change is audited'
);

insert into public.orders (id, order_number, user_id, status, total, created_at)
values (
  '22000000-0000-0000-0000-000000000001',
  'PHASE8-OVERDUE',
  '12000000-0000-0000-0000-000000000001',
  'confirmed',
  1000,
  (((now() at time zone 'Europe/Istanbul')::date - 40)::timestamp + time '12:00') at time zone 'Europe/Istanbul'
);

select * from public.sync_order_accounting('22000000-0000-0000-0000-000000000001');

select is(
  (select due_date from public.account_transactions where order_id = '22000000-0000-0000-0000-000000000001' and type = 'ORDER'),
  (now() at time zone 'Europe/Istanbul')::date - 10,
  'order due date equals Istanbul order date plus customer term'
);

select is(
  (select overdue_days from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  10,
  'overdue days are calculated against Istanbul business date'
);

select is(
  (select status from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  'OVERDUE',
  'unpaid past-due order is overdue'
);

select * from public.record_account_payment(
  p_customer_id => '12000000-0000-0000-0000-000000000001',
  p_amount => 400,
  p_order_id => '22000000-0000-0000-0000-000000000001',
  p_idempotency_key => 'phase8-partial'
);

select is(
  (select status from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  'PARTIAL_PAID',
  'partially collected receivable has partial status'
);

select is(
  (select remaining_amount from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  600.00::numeric,
  'partial collection reduces remaining amount'
);

select is(
  (select overdue_balance from public.customer_account_summaries where customer_id = '12000000-0000-0000-0000-000000000001'),
  600.00::numeric,
  'summary overdue balance uses allocation-aware remaining amount'
);

select * from public.reverse_account_payment(
  (select id from public.payments where idempotency_key = 'phase8-partial')
);

select is(
  (select remaining_amount from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  1000.00::numeric,
  'payment reversal restores receivable remaining amount'
);

select * from public.set_account_transaction_due_date(
  (select id from public.account_transactions where order_id = '22000000-0000-0000-0000-000000000001' and type = 'ORDER'),
  (now() at time zone 'Europe/Istanbul')::date + 5,
  'Test extension'
);

select is(
  (select remaining_days from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  5,
  'due-date override updates remaining days'
);

select is(
  (select status from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  'APPROACHING',
  'receivable due within seven days is approaching'
);

select is(
  (select due_date from public.account_transactions where order_id = '22000000-0000-0000-0000-000000000001' and type = 'ORDER'),
  (now() at time zone 'Europe/Istanbul')::date - 10,
  'due-date override does not mutate immutable ledger row'
);

select * from public.set_account_transaction_due_date(
  (select id from public.account_transactions where order_id = '22000000-0000-0000-0000-000000000001' and type = 'ORDER'),
  (now() at time zone 'Europe/Istanbul')::date,
  'Due today'
);

select is(
  (select due_date from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  (now() at time zone 'Europe/Istanbul')::date,
  'latest due-date history entry wins'
);

select is(
  (select status from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  'DUE_TODAY',
  'Istanbul business date is classified as due today'
);

select is(
  (select count(*) from public.account_transaction_due_dates where transaction_id = (select id from public.account_transactions where order_id = '22000000-0000-0000-0000-000000000001' and type = 'ORDER')),
  2::bigint,
  'due-date changes are append-only history'
);

select * from public.record_account_payment(
  p_customer_id => '12000000-0000-0000-0000-000000000001',
  p_amount => 1000,
  p_order_id => '22000000-0000-0000-0000-000000000001',
  p_idempotency_key => 'phase8-full'
);

select is(
  (select status from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  'PAID',
  'fully collected receivable is paid'
);

select is(
  (select remaining_amount from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000001'),
  0.00::numeric,
  'paid receivable has no remaining amount'
);

select is(
  (select overdue_balance from public.customer_account_summaries where customer_id = '12000000-0000-0000-0000-000000000001'),
  0.00::numeric,
  'paid receivable is removed from overdue summary'
);

select public.update_customer_payment_terms('12000000-0000-0000-0000-000000000001', 0);

insert into public.orders (id, order_number, user_id, status, total, created_at)
values (
  '22000000-0000-0000-0000-000000000002',
  'PHASE8-TZ-BOUNDARY',
  '12000000-0000-0000-0000-000000000001',
  'confirmed',
  50,
  (((now() at time zone 'Europe/Istanbul')::date)::timestamp + time '00:30') at time zone 'Europe/Istanbul'
);

select * from public.sync_order_accounting('22000000-0000-0000-0000-000000000002');

select is(
  (select due_date from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000002'),
  (now() at time zone 'Europe/Istanbul')::date,
  '00:30 Istanbul order stays on the same business date'
);

select is(
  (select status from public.customer_receivable_due_status where order_id = '22000000-0000-0000-0000-000000000002'),
  'DUE_TODAY',
  'timezone-boundary order is due today, not yesterday'
);

select * from finish();
rollback;

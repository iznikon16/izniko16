begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase9@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase9-manager@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.customer_profiles (user_id, email, full_name)
values ('13000000-0000-0000-0000-000000000001', 'phase9@example.test', 'Phase 9 Customer')
on conflict (user_id) do update set email = excluded.email;

select lives_ok(
  $$ select public.update_customer_risk_settings('13000000-0000-0000-0000-000000000001', 1000, 'warn', 80) $$,
  'risk settings can be configured'
);

select * from public.append_account_transaction(
  p_customer_id => '13000000-0000-0000-0000-000000000001',
  p_type => 'ADJUSTMENT', p_debit => 600, p_credit => 0,
  p_description => 'Phase 9 opening debt', p_idempotency_key => 'phase9-opening'
);

select is(
  (select ledger_exposure from public.customer_risk_status where customer_id = '13000000-0000-0000-0000-000000000001'),
  600.00::numeric,
  'open current-account debt is included in exposure'
);

insert into public.orders (id, order_number, user_id, status, total)
values ('23000000-0000-0000-0000-000000000001', 'PHASE9-WARN', '13000000-0000-0000-0000-000000000001', 'pending_payment', 250);

select is(
  (select risk_decision from public.orders where id = '23000000-0000-0000-0000-000000000001'),
  'warning',
  'warning threshold is stored on the order'
);

select is(
  (select used_limit from public.customer_risk_status where customer_id = '13000000-0000-0000-0000-000000000001'),
  600.00::numeric,
  'pending unapproved order is not counted as used exposure'
);

update public.orders set status = 'confirmed' where id = '23000000-0000-0000-0000-000000000001';

select is(
  (select unposted_order_exposure from public.customer_risk_status where customer_id = '13000000-0000-0000-0000-000000000001'),
  250.00::numeric,
  'approved but unposted order is included in exposure'
);

select * from public.sync_order_accounting('23000000-0000-0000-0000-000000000001');

select is(
  (select used_limit from public.customer_risk_status where customer_id = '13000000-0000-0000-0000-000000000001'),
  850.00::numeric,
  'posted order is not counted twice'
);

select is(
  (select unposted_order_exposure from public.customer_risk_status where customer_id = '13000000-0000-0000-0000-000000000001'),
  0.00::numeric,
  'posting removes order from unposted exposure'
);

select lives_ok(
  $$ select public.update_customer_risk_settings('13000000-0000-0000-0000-000000000001', 1000, 'require_approval', 80) $$,
  'manager approval policy can be selected'
);

insert into public.orders (id, order_number, user_id, status, total)
values ('23000000-0000-0000-0000-000000000002', 'PHASE9-APPROVAL', '13000000-0000-0000-0000-000000000001', 'pending_payment', 200);

select is(
  (select risk_decision from public.orders where id = '23000000-0000-0000-0000-000000000002'),
  'approval_required',
  'over-limit order is marked for manager approval'
);

select throws_ok(
  $$ update public.orders set status = 'confirmed' where id = '23000000-0000-0000-0000-000000000002' $$,
  'P0001',
  'Risk limiti aşıldı; sipariş yönetici onayı bekliyor.',
  'postable transition is rejected before manager approval'
);

select lives_ok(
  $$ select public.approve_order_risk('23000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002') $$,
  'manager can approve the order risk'
);

select lives_ok(
  $$ update public.orders set status = 'confirmed' where id = '23000000-0000-0000-0000-000000000002' $$,
  'approved order can enter a postable status'
);

select lives_ok(
  $$ select public.update_customer_risk_settings('13000000-0000-0000-0000-000000000001', 1000, 'block', 80) $$,
  'blocking policy can be selected'
);

select throws_ok(
  $$ insert into public.orders (id, order_number, user_id, status, total) values ('23000000-0000-0000-0000-000000000003', 'PHASE9-BLOCK', '13000000-0000-0000-0000-000000000001', 'pending_payment', 10) $$,
  'P0001',
  'Risk limiti aşıldı; sipariş politikaya göre engellendi.',
  'blocking policy rejects an over-limit order'
);

select lives_ok(
  $$ select public.update_customer_risk_settings('13000000-0000-0000-0000-000000000001', 0, 'block', 80) $$,
  'zero limit remains explicitly unlimited'
);

select lives_ok(
  $$ insert into public.orders (id, order_number, user_id, status, total) values ('23000000-0000-0000-0000-000000000004', 'PHASE9-UNLIMITED', '13000000-0000-0000-0000-000000000001', 'pending_payment', 9999) $$,
  'unlimited account is not blocked'
);

select ok(
  (select count(*) >= 4 from public.audit_logs where action = 'customer_risk_settings_updated' and resource_id = '13000000-0000-0000-0000-000000000001'),
  'risk setting changes are audited'
);

select is(
  (select count(*) from public.audit_logs where action = 'order_risk_approved' and resource_id = '23000000-0000-0000-0000-000000000002'),
  1::bigint,
  'manager approval is audited'
);

select throws_ok(
  $$ select * from public.evaluate_customer_risk('13000000-0000-0000-0000-000000000001', -1) $$,
  '22023',
  'Proposed amount cannot be negative.',
  'negative proposed exposure is rejected'
);

select * from finish();
rollback;

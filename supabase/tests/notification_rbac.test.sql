begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  (select count(*) from public.permissions where key like 'account.%'),
  9::bigint,
  'all accounting permissions are seeded'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key = 'account.collectPayment'
  ),
  'staff receives collection permission'
);

select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key = 'account.manageRiskLimit'
  ),
  'staff does not receive risk management by default'
);

select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key = 'account.sendPaymentReminder'
  ),
  'staff does not receive SMS permission by default'
);

select is(
  (select count(*) from public.sms_templates where key in (
    'payment_due_soon', 'payment_due_today', 'payment_overdue', 'payment_received', 'manual_payment_reminder'
  )),
  5::bigint,
  'payment notification templates are seeded'
);

select lives_ok(
  $$insert into public.sms_logs(recipient_phone, body, status, event_type, event_key)
    values ('905321112233', 'test', 'pending', 'PAYMENT_DUE_TODAY', 'pgtap:event:1')$$,
  'first event reservation succeeds'
);

select throws_ok(
  $$insert into public.sms_logs(recipient_phone, body, status, event_type, event_key)
    values ('905321112233', 'test duplicate', 'pending', 'PAYMENT_DUE_TODAY', 'pgtap:event:1')$$,
  '23505',
  null,
  'duplicate event reservation is rejected'
);

select ok(
  exists (select 1 from public.system_settings where key = 'payment_sms_reminders'),
  'automated reminder settings exist'
);

select is(
  (select (value ->> 'enabled')::boolean from public.system_settings where key = 'payment_sms_reminders'),
  false,
  'automated reminders default to opt-in disabled'
);

select * from finish();
rollback;

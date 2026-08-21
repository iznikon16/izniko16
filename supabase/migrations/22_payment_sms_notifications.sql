-- Faz 12: mevcut sms_logs tablosunu cari bildirim teslimat günlüğü olarak genişletir.

alter table public.sms_logs
  add column if not exists customer_id uuid references public.customer_profiles(user_id) on delete set null,
  add column if not exists event_type text,
  add column if not exists event_key text,
  add column if not exists due_transaction_id uuid references public.account_transactions(id) on delete set null,
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null;

alter table public.sms_logs
  drop constraint if exists sms_logs_event_type_check;
alter table public.sms_logs
  add constraint sms_logs_event_type_check check (
    event_type is null or event_type in (
      'PAYMENT_DUE_SOON',
      'PAYMENT_DUE_TODAY',
      'PAYMENT_OVERDUE',
      'PAYMENT_RECEIVED',
      'MANUAL_PAYMENT_REMINDER'
    )
  );

create unique index if not exists idx_sms_logs_event_key
  on public.sms_logs(event_key)
  where event_key is not null;
create index if not exists idx_sms_logs_customer_created
  on public.sms_logs(customer_id, created_at desc);
create index if not exists idx_sms_logs_due_transaction
  on public.sms_logs(due_transaction_id, created_at desc);

insert into public.sms_templates(key, name, body, is_enabled)
values
  ('payment_due_soon', 'Vade Yaklaşıyor', 'Sayın {{customer_name}}, {{due_date}} vadeli {{due_amount}} ödemenizin vadesi yaklaşıyor. Güncel bakiyeniz {{balance}}.', true),
  ('payment_due_today', 'Vade Bugün', 'Sayın {{customer_name}}, {{due_amount}} tutarındaki ödemenizin vadesi bugün. Güncel bakiyeniz {{balance}}.', true),
  ('payment_overdue', 'Gecikmiş Ödeme', 'Sayın {{customer_name}}, {{due_amount}} tutarındaki ödemeniz {{days_overdue}} gün gecikmiştir. Güncel bakiyeniz {{balance}}.', true),
  ('payment_received', 'Tahsilat Alındı', 'Sayın {{customer_name}}, {{payment_amount}} tutarındaki tahsilatınız alınmıştır. Güncel bakiyeniz {{balance}}.', true),
  ('manual_payment_reminder', 'Manuel Ödeme Hatırlatması', 'Sayın {{customer_name}}, güncel cari bakiyeniz {{balance}}, vadesi geçmiş tutarınız {{due_amount}}. Ödeme planınız için bizimle iletişime geçebilirsiniz.', true)
on conflict (key) do nothing;

insert into public.system_settings(key, value)
values (
  'payment_sms_reminders',
  '{"enabled":false,"due_soon_days":3,"overdue_after_days":1}'::jsonb
)
on conflict (key) do nothing;

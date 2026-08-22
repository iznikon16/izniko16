-- Faz 30: Audit kayıtlarını fiziksel olarak silmeden yönetilebilir tutar.

alter table public.audit_logs
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deletion_reason text not null default '';

create index if not exists idx_audit_logs_active_created
  on public.audit_logs (created_at desc)
  where deleted_at is null;

create index if not exists idx_audit_logs_action_created
  on public.audit_logs (action, created_at desc);

create index if not exists idx_audit_logs_actor_created
  on public.audit_logs (actor_user_id, created_at desc);

comment on column public.audit_logs.deleted_at is
  'UI temizliği için soft-delete zamanı; audit kaydı fiziksel olarak korunur.';

comment on column public.audit_logs.deleted_by is
  'Kaydı görünümden kaldıran super admin.';

revoke update, delete on public.audit_logs from anon, authenticated;

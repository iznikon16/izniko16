-- Faz 22A: entegrasyon hazirlik durumu, guvenli test gecmisi ve RBAC.

insert into public.permissions(key, description)
values ('settings.manageIntegrations', 'Entegrasyon kimlik bilgilerini ve testlerini yonetme')
on conflict (key) do update set description = excluded.description;

insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'settings.manageIntegrations'
where role.name = 'admin'
on conflict do nothing;

create table public.integration_health_checks (
  id uuid primary key default gen_random_uuid(),
  integration_key text not null check (integration_key in ('paytr', 'iyzico', 'odeal', 'netgsm', 'smtp')),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'live')),
  check_type text not null default 'configuration' check (check_type in ('configuration', 'connection', 'delivery')),
  status text not null check (status in ('ready', 'success', 'failed', 'not_configured')),
  message text not null default '',
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index idx_integration_health_checks_latest
  on public.integration_health_checks(integration_key, checked_at desc);

alter table public.integration_health_checks enable row level security;

create policy "Admins can read integration health checks"
  on public.integration_health_checks for select
  using (public.is_admin());

comment on table public.integration_health_checks is
  'Secret icermeyen entegrasyon yapilandirma, baglanti ve teslimat testi gecmisi.';

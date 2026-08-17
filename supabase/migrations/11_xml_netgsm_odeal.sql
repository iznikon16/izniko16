-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 11_xml_netgsm.sql — XML entegrasyonu + Netgsm SMS + Ödeal ayarları
-- ============================================================================

-- ----------------------------------------------------------------------------
-- xml_sources: XML kaynakları
-- ----------------------------------------------------------------------------
create table public.xml_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  is_active boolean not null default true,
  schedule_minutes integer not null default 60,
  price_markup numeric(6,2) not null default 0,
  last_run_at timestamptz,
  last_status text not null default 'idle', -- idle | running | success | error
  last_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- xml_field_mappings: XML kaynağı field mapping
-- ----------------------------------------------------------------------------
create table public.xml_field_mappings (
  id uuid primary key default gen_random_uuid(),
  xml_source_id uuid not null references public.xml_sources (id) on delete cascade,
  source_field text not null, -- XML'deki alan adı (örn. ProductName)
  target_field text not null, -- ürün alanı (name|sku|price|stock|image|category|brand|description|retail_price)
  created_at timestamptz not null default now(),
  unique (xml_source_id, source_field)
);

-- ----------------------------------------------------------------------------
-- xml_sync_runs: Sync çalıştırma geçmişi
-- ----------------------------------------------------------------------------
create table public.xml_sync_runs (
  id uuid primary key default gen_random_uuid(),
  xml_source_id uuid references public.xml_sources (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- running | success | error
  total_products integer not null default 0,
  created_products integer not null default 0,
  updated_products integer not null default 0,
  error_message text not null default '',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- xml_sync_errors: Sync hataları
-- ----------------------------------------------------------------------------
create table public.xml_sync_errors (
  id uuid primary key default gen_random_uuid(),
  xml_sync_run_id uuid references public.xml_sync_runs (id) on delete cascade,
  sku text not null default '',
  message text not null default '',
  raw_data text not null default '',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- netgsm_settings: Netgsm API ayarları (tek satır)
-- ----------------------------------------------------------------------------
create table public.netgsm_settings (
  id text primary key default 'main',
  username text not null default '',
  password text not null default '',
  header text not null default '',
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- odeal_settings: Ödeal API ayarları (tek satır)
-- ----------------------------------------------------------------------------
create table public.odeal_settings (
  id text primary key default 'main',
  api_key text not null default '',
  secret_key text not null default '',
  is_test_mode boolean not null default true,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXLER
-- ============================================================================
create index if not exists idx_xml_sync_runs_source on public.xml_sync_runs (xml_source_id, started_at desc);
create index if not exists idx_xml_sync_errors_run on public.xml_sync_errors (xml_sync_run_id);

-- ============================================================================
-- RLS (tümü admin-only; publishable key kapalı)
-- ============================================================================
alter table public.xml_sources enable row level security;
alter table public.xml_field_mappings enable row level security;
alter table public.xml_sync_runs enable row level security;
alter table public.xml_sync_errors enable row level security;
alter table public.netgsm_settings enable row level security;
alter table public.odeal_settings enable row level security;

create policy "Admin can read xml sources"
  on public.xml_sources for select
  using (public.is_admin());
create policy "Admin can insert xml sources"
  on public.xml_sources for insert
  with check (public.is_admin());
create policy "Admin can update xml sources"
  on public.xml_sources for update
  using (public.is_admin());
create policy "Admin can delete xml sources"
  on public.xml_sources for delete
  using (public.is_admin());

create policy "Admin can read xml field mappings"
  on public.xml_field_mappings for select
  using (public.is_admin());
create policy "Admin can insert xml field mappings"
  on public.xml_field_mappings for insert
  with check (public.is_admin());
create policy "Admin can update xml field mappings"
  on public.xml_field_mappings for update
  using (public.is_admin());
create policy "Admin can delete xml field mappings"
  on public.xml_field_mappings for delete
  using (public.is_admin());

create policy "Admin can read xml sync runs"
  on public.xml_sync_runs for select
  using (public.is_admin());
create policy "Admin can insert xml sync runs"
  on public.xml_sync_runs for insert
  with check (public.is_admin());
create policy "Admin can update xml sync runs"
  on public.xml_sync_runs for update
  using (public.is_admin());
create policy "Admin can delete xml sync runs"
  on public.xml_sync_runs for delete
  using (public.is_admin());

create policy "Admin can read xml sync errors"
  on public.xml_sync_errors for select
  using (public.is_admin());
create policy "Admin can insert xml sync errors"
  on public.xml_sync_errors for insert
  with check (public.is_admin());

create policy "Admin can read netgsm settings"
  on public.netgsm_settings for select
  using (public.is_admin());
create policy "Admin can update netgsm settings"
  on public.netgsm_settings for update
  using (public.is_admin());

create policy "Admin can read odeal settings"
  on public.odeal_settings for select
  using (public.is_admin());
create policy "Admin can update odeal settings"
  on public.odeal_settings for update
  using (public.is_admin());

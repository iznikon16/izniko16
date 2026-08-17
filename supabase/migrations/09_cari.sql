-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 09_cari.sql — Cari / Ön Muhasebe + Stok + Audit + Bildirim tabloları
-- ----------------------------------------------------------------------------
-- Bu dosya Supabase SQL Editor'da, 08_seed.sql'den SONRA çalıştırılır.
-- Cari modül: immutable ledger + transaction + idempotency + audit.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customer_accounts: Her müşteri için cari hesap (Customer ile 1-1)
-- ----------------------------------------------------------------------------
create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid unique not null references public.customer_profiles (user_id) on delete cascade,
  risk_limit numeric(14,2) not null default 0,
  overdue_balance numeric(14,2) not null default 0,
  last_transaction_at timestamptz,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ÖNEMLİ: account_transactions ve payments birbirine FK ile bağlıdır.
-- İkisi arasında döngüsel bağımlılık olduğu için önce payments (FK olmadan),
-- sonra account_transactions, en son payments'a FK eklenir.

-- ----------------------------------------------------------------------------
-- payments: Tahsilatlar (immutable; iptal edilirse reversal kaydı açılır)
-- ----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  amount numeric(14,2) not null default 0,
  paid_at timestamptz not null default now(),
  payment_method text not null default '',
  reference_number text not null default '',
  description text not null default '',
  status text not null default 'completed', -- completed | reversed
  provider text not null default 'manual', -- manual | odeal | paytr | iyzico ...
  provider_reference text,
  actor_user_id uuid references auth.users (id) on delete set null,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- account_transactions: Cari hareket LEDGER'ı (immutable, asla fiziksel silinmez)
-- Bakiye bu tablodaki hareketlerden hesaplanır; mutable tutulan rakam yoktur.
-- ----------------------------------------------------------------------------
create table public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  type text not null, -- ORDER | PAYMENT | PARTIAL_PAYMENT | REFUND | ADJUSTMENT | CANCELLATION | OPENING_BALANCE
  debit numeric(14,2) not null default 0,   -- borç (müşterinin borcu artar)
  credit numeric(14,2) not null default 0,  -- alacak (borç azalır)
  amount numeric(14,2) not null default 0,
  balance_after numeric(14,2) not null default 0,
  order_id uuid references public.orders (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  due_date date,
  description text not null default '',
  reference text not null default '',
  actor_user_id uuid references auth.users (id) on delete set null,
  is_reversal boolean not null default false,
  reversed_transaction_id uuid references public.account_transactions (id) on delete set null,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- account_transactions tablosu oluştuğuna göre payments'taki boş FK'ları ekle
-- (payments.account_transactions ilişkisi gerekmiyor; account_transactions.payment_id yeterli)

-- ----------------------------------------------------------------------------
-- payment_allocations: Tahsilatın siparişlere dağılımı (kısmi tahsilat için)
-- ----------------------------------------------------------------------------
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  allocated_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- stock_movements: Stok hareket geçmişi (immutable)
-- ----------------------------------------------------------------------------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_change integer not null default 0,
  previous_quantity integer not null default 0,
  resulting_quantity integer not null default 0,
  type text not null default 'adjustment', -- order_in | order_out | xml_update | manual_in | manual_out | order_cancel
  reference text not null default '',
  order_id uuid references public.orders (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- audit_logs: Kritik işlem izleri
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null default '',
  old_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text not null default '',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notifications: Bildirim merkezi
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'info', -- order | stock | payment | xml | sms | smtp | system
  is_read boolean not null default false,
  link text not null default '',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- sms_templates: Netgsm SMS şablonları
-- ----------------------------------------------------------------------------
create table public.sms_templates (
  key text primary key,
  name text not null,
  body text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- sms_logs: SMS gönderim logları
-- ----------------------------------------------------------------------------
create table public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  template_key text references public.sms_templates (key) on delete set null,
  body text not null default '',
  status text not null default 'sent',
  error_message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- system_settings: Genel sistem ayarları (JSON anahtar-değer)
-- ----------------------------------------------------------------------------
create table public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXLER
-- ============================================================================

create index if not exists idx_account_transactions_customer_date
  on public.account_transactions (customer_id, created_at desc);
create index if not exists idx_account_transactions_order
  on public.account_transactions (order_id);
create index if not exists idx_account_transactions_payment
  on public.account_transactions (payment_id);
create index if not exists idx_account_transactions_duedate
  on public.account_transactions (due_date);
create index if not exists idx_account_transactions_type
  on public.account_transactions (type);

create index if not exists idx_payments_customer on public.payments (customer_id);
create index if not exists idx_payments_order on public.payments (order_id);
create index if not exists idx_payments_created on public.payments (paid_at desc);

create index if not exists idx_payment_allocations_payment on public.payment_allocations (payment_id);
create index if not exists idx_payment_allocations_order on public.payment_allocations (order_id);

create index if not exists idx_stock_movements_product on public.stock_movements (product_id, created_at desc);
create index if not exists idx_stock_movements_order on public.stock_movements (order_id);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_resource on public.audit_logs (resource_type, resource_id);

create index if not exists idx_notifications_user on public.notifications (user_id, is_read);

create index if not exists idx_sms_logs_created on public.sms_logs (created_at desc);

-- ============================================================================
-- RLS (tüm cari/stok/audit tabloları default KAPALI — yalnızca server/service role)
-- ============================================================================
alter table public.customer_accounts enable row level security;
alter table public.account_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.sms_templates enable row level security;
alter table public.sms_logs enable row level security;
alter table public.system_settings enable row level security;

-- Müşteri yalnızca KENDİ cari özetini görebilir (server üzerinden hesaplanır,
-- burada yalnızca güvenlik kontrolü)
create policy "Customer can read own account"
  on public.customer_accounts for select
  using (auth.uid() = customer_id);

create policy "Customer can read own transactions"
  on public.account_transactions for select
  using (auth.uid() = customer_id);

create policy "Customer can read own payments"
  on public.payments for select
  using (auth.uid() = customer_id);

create policy "Customer can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Customer can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Admin politikaları
create policy "Admin can read all customer accounts"
  on public.customer_accounts for select
  using (public.is_admin());

create policy "Admin can update customer accounts"
  on public.customer_accounts for update
  using (public.is_admin());

create policy "Admin can read all account transactions"
  on public.account_transactions for select
  using (public.is_admin());

create policy "Admin can insert account transactions"
  on public.account_transactions for insert
  with check (public.is_admin());

create policy "Admin can read all payments"
  on public.payments for select
  using (public.is_admin());

create policy "Admin can insert payments"
  on public.payments for insert
  with check (public.is_admin());

create policy "Admin can update payments"
  on public.payments for update
  using (public.is_admin());

create policy "Admin can read all payment allocations"
  on public.payment_allocations for select
  using (public.is_admin());

create policy "Admin can insert payment allocations"
  on public.payment_allocations for insert
  with check (public.is_admin());

create policy "Admin can read all stock movements"
  on public.stock_movements for select
  using (public.is_admin());

create policy "Admin can insert stock movements"
  on public.stock_movements for insert
  with check (public.is_admin());

create policy "Admin can read all audit logs"
  on public.audit_logs for select
  using (public.is_admin());

create policy "Admin can insert audit logs"
  on public.audit_logs for insert
  with check (public.is_admin());

create policy "Admin can read all notifications"
  on public.notifications for select
  using (public.is_admin());

create policy "Admin can insert notifications"
  on public.notifications for insert
  with check (public.is_admin());

create policy "Admin can read all sms templates"
  on public.sms_templates for select
  using (public.is_admin());

create policy "Admin can update sms templates"
  on public.sms_templates for update
  using (public.is_admin());

create policy "Admin can read all sms logs"
  on public.sms_logs for select
  using (public.is_admin());

create policy "Admin can read system settings"
  on public.system_settings for select
  using (public.is_admin());

create policy "Admin can update system settings"
  on public.system_settings for update
  using (public.is_admin());

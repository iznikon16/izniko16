-- ============================================================================
-- İZNİKO — SUPABASE MIGRATION
-- 12_fiyat_rbac.sql — Fiyat listeleri + müşteri özel fiyatı + RBAC (roller/izinler)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- price_lists: Fiyat listeleri (Bayi A, Bayi B, Toptancı, Perakende vb.)
-- ----------------------------------------------------------------------------
create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- price_list_items: Fiyat listesinde ürün bazlı fiyat
-- ----------------------------------------------------------------------------
create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(14,2),
  discount_percent numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_list_id, product_id)
);

-- ----------------------------------------------------------------------------
-- customer_price_lists: Müşteriye atanmış fiyat listesi (1-1)
-- ----------------------------------------------------------------------------
create table public.customer_price_lists (
  customer_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, price_list_id)
);

-- ----------------------------------------------------------------------------
-- customer_product_prices: Müşteriye özel ürün fiyatı (en yüksek öncelik)
-- ----------------------------------------------------------------------------
create table public.customer_product_prices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

-- ----------------------------------------------------------------------------
-- customer_discounts: Müşteriye özel indirim oranı (%)
-- ----------------------------------------------------------------------------
create table public.customer_discounts (
  customer_id uuid not null references public.customer_profiles (user_id) on delete cascade,
  discount_percent numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_id)
);

-- ----------------------------------------------------------------------------
-- RBAC: roles, permissions, role_permissions
-- ----------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- admin | staff | customer
  label text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,           -- customer.view, order.cancel, account.collectPayment ...
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- admin_users.role -> roles.name eşleştirmesi için rol kontrol fonksiyonu
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('admin', 'staff', 'customer'));

-- ----------------------------------------------------------------------------
-- INDEXLER
-- ----------------------------------------------------------------------------
create index if not exists idx_price_list_items_list on public.price_list_items (price_list_id);
create index if not exists idx_price_list_items_product on public.price_list_items (product_id);
create index if not exists idx_customer_product_prices_customer on public.customer_product_prices (customer_id);
create index if not exists idx_customer_product_prices_product on public.customer_product_prices (product_id);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.customer_price_lists enable row level security;
alter table public.customer_product_prices enable row level security;
alter table public.customer_discounts enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Halk fiyat listelerini okuyabilir
create policy "Public can read active price lists"
  on public.price_lists for select
  using (is_active = true);

create policy "Public can read price list items"
  on public.price_list_items for select
  using (true);

-- Müşteri kendi fiyat/discount bilgilerini görebilir
create policy "Customer can read own price list assignment"
  on public.customer_price_lists for select
  using (auth.uid() = customer_id);

create policy "Customer can read own product prices"
  on public.customer_product_prices for select
  using (auth.uid() = customer_id);

create policy "Customer can read own discount"
  on public.customer_discounts for select
  using (auth.uid() = customer_id);

-- Admin her şey
create policy "Admin can read all price lists"
  on public.price_lists for select using (public.is_admin());
create policy "Admin can insert price lists"
  on public.price_lists for insert with check (public.is_admin());
create policy "Admin can update price lists"
  on public.price_lists for update using (public.is_admin());
create policy "Admin can delete price lists"
  on public.price_lists for delete using (public.is_admin());

create policy "Admin can read all price list items"
  on public.price_list_items for select using (public.is_admin());
create policy "Admin can insert price list items"
  on public.price_list_items for insert with check (public.is_admin());
create policy "Admin can update price list items"
  on public.price_list_items for update using (public.is_admin());
create policy "Admin can delete price list items"
  on public.price_list_items for delete using (public.is_admin());

create policy "Admin can read all customer price lists"
  on public.customer_price_lists for select using (public.is_admin());
create policy "Admin can update customer price lists"
  on public.customer_price_lists for update using (public.is_admin());

create policy "Admin can read all customer product prices"
  on public.customer_product_prices for select using (public.is_admin());
create policy "Admin can insert customer product prices"
  on public.customer_product_prices for insert with check (public.is_admin());
create policy "Admin can update customer product prices"
  on public.customer_product_prices for update using (public.is_admin());

create policy "Admin can read all customer discounts"
  on public.customer_discounts for select using (public.is_admin());
create policy "Admin can update customer discounts"
  on public.customer_discounts for update using (public.is_admin());

create policy "Public can read roles"
  on public.roles for select using (true);
create policy "Public can read permissions"
  on public.permissions for select using (true);
create policy "Public can read role permissions"
  on public.role_permissions for select using (true);

create policy "Admin can manage roles"
  on public.roles for all using (public.is_admin());
create policy "Admin can manage permissions"
  on public.permissions for all using (public.is_admin());
create policy "Admin can manage role permissions"
  on public.role_permissions for all using (public.is_admin());

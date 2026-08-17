-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 02_tables.sql — Tablolar
-- ============================================================================

-- ----------------------------------------------------------------------------
-- admin_users: Yönetici / personel hesapları (auth.users.user_id ile eşleşir)
-- ----------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin',
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- brands: Markalar
-- ----------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- categories: Kategoriler (parent_id ile hiyerarşik)
-- ----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- products: Ürünler
-- ----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null default '',
  brand_id uuid references public.brands (id) on delete set null,
  price numeric(14,2),
  compare_at_price numeric(14,2),
  price_mode public.price_mode not null default 'fixed',
  price_note text,
  currency text not null default 'TRY',
  status public.product_status not null default 'draft',
  stock_status public.stock_status not null default 'in_stock',
  featured boolean not null default false,
  is_active boolean not null default true,
  featured_image_path text,
  badge text,
  tags text[] not null default '{}',
  warranty_years integer,
  capacity_kw numeric(10,2),
  energy_class text,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- product_images: Ürün görselleri (storage_path -> Supabase Storage)
-- ----------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  caption text not null default '',
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- product_categories: Ürün-kategori ilişkisi (çoktan çoğa)
-- ----------------------------------------------------------------------------
create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

-- ----------------------------------------------------------------------------
-- product_highlights: Ürün öne çıkanlar
-- ----------------------------------------------------------------------------
create table public.product_highlights (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- product_attributes: Ürün teknik özellikleri
-- ----------------------------------------------------------------------------
create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  attribute_group text not null default 'Genel',
  name text not null,
  value text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- campaigns: Kampanyalar
-- ----------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  headline text not null default '',
  description text not null default '',
  campaign_type text not null default 'banner',
  discount_type text not null default 'fixed',
  discount_value numeric(14,2) not null default 0,
  minimum_order_total numeric(14,2) not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- coupons: Kuponlar
-- ----------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  discount_type text not null default 'fixed',
  discount_value numeric(14,2) not null default 0,
  maximum_discount numeric(14,2),
  minimum_order_total numeric(14,2) not null default 0,
  stackable boolean not null default false,
  usage_count integer not null default 0,
  usage_limit integer,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customer_profiles: Müşteri profilleri (auth.users.user_id ile eşleşir)
-- ----------------------------------------------------------------------------
create table public.customer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  is_vip boolean not null default false,
  is_blocked boolean not null default false,
  marketing_consent boolean not null default false,
  email_verified_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customer_addresses: Müşteri adresleri
-- ----------------------------------------------------------------------------
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Teslimat',
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  district text not null default '',
  neighborhood text not null default '',
  address_line text not null default '',
  postal_code text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customer_favorites: Müşteri favorileri
-- ----------------------------------------------------------------------------
create table public.customer_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ----------------------------------------------------------------------------
-- cart_items: Sepet öğeleri
-- ----------------------------------------------------------------------------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customer_inquiries: Müşteri talepleri / iletişim formları
-- ----------------------------------------------------------------------------
create table public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  subject text not null default '',
  message text not null default '',
  product_id uuid references public.products (id) on delete set null,
  product_title text not null default '',
  services text[] not null default '{}',
  source text not null default 'contact',
  status text not null default 'new',
  location text not null default '',
  admin_note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- payment_methods: Ödeme yöntemleri (config JSONB içinde provider ayarları)
-- ----------------------------------------------------------------------------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  provider public.payment_provider not null default 'offline',
  integration_type text not null default 'manual',
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- orders: Siparişler
-- ----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users (id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'pending',
  payment_provider public.payment_provider not null default 'offline',
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  payment_reference text,
  currency text not null default 'TRY',
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  shipping_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  note text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- order_items: Sipariş kalemleri
-- ----------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_title text not null,
  product_slug text not null default '',
  product_image_url text not null default '',
  unit_price numeric(14,2) not null default 0,
  quantity integer not null default 1,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- payment_attempts: Ödeme denemeleri
-- ----------------------------------------------------------------------------
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  provider public.payment_provider not null default 'offline',
  status public.payment_status not null default 'pending',
  amount numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  provider_reference text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- email_templates: E-posta şablonları
-- ----------------------------------------------------------------------------
create table public.email_templates (
  key text primary key,
  name text not null,
  description text not null default '',
  subject text not null,
  preheader text not null default '',
  html_body text not null,
  text_body text not null default '',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- email_logs: E-posta gönderim logları
-- ----------------------------------------------------------------------------
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null default '',
  template_key text references public.email_templates (key) on delete set null,
  status text not null default 'sent',
  error_message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- email_verification_tokens: E-posta doğrulama tokenları
-- ----------------------------------------------------------------------------
create table public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- smtp_settings: SMTP ayarları (tek satır)
-- ----------------------------------------------------------------------------
create table public.smtp_settings (
  id text primary key default 'main',
  host text not null default '',
  port integer not null default 587,
  username text not null default '',
  password text not null default '',
  secure boolean not null default false,
  from_email text not null default '',
  from_name text not null default '',
  reply_to text not null default '',
  admin_notification_email text not null default '',
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- home_slides: Ana sayfa slider
-- ----------------------------------------------------------------------------
create table public.home_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text not null default '',
  href text not null default '/',
  image_path text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- home_video_settings: Ana sayfa video ayarları (tek satır)
-- ----------------------------------------------------------------------------
create table public.home_video_settings (
  id text primary key default 'main',
  title text not null,
  eyebrow text not null default 'Video',
  description text not null default '',
  video_url text not null,
  video_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- project_references: Referanslar
-- ----------------------------------------------------------------------------
create table public.project_references (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  customer_name text not null default '',
  location text not null default '',
  service_type text not null default '',
  image_path text,
  image_alt text not null default '',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- policy_pages: Politika / sözleşme sayfaları
-- ----------------------------------------------------------------------------
create table public.policy_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  content_html text not null default '',
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 05_rls.sql — RLS enable + Halka açık ve Müşteri politikaları
-- ----------------------------------------------------------------------------
-- ÖNEMLİ: Tüm business logic Next.js server katmanında çalışır ve
-- service_role key kullanır. Service role RLS'yi BYPASS eder.
-- Bu politikalar yalnızca doğrudan client (publishable key) erişimini
-- kısıtlamak içindir.
-- ============================================================================

alter table public.admin_users enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_highlights enable row level security;
alter table public.product_attributes enable row level security;
alter table public.campaigns enable row level security;
alter table public.coupons enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_favorites enable row level security;
alter table public.cart_items enable row level security;
alter table public.customer_inquiries enable row level security;
alter table public.payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_verification_tokens enable row level security;
alter table public.smtp_settings enable row level security;
alter table public.home_slides enable row level security;
alter table public.home_video_settings enable row level security;
alter table public.project_references enable row level security;
alter table public.policy_pages enable row level security;

-- ----------------------------------------------------------------------------
-- Halka açık katalog verileri (yalnızca okuma)
-- ----------------------------------------------------------------------------
create policy "Public can read active brands"
  on public.brands for select
  using (is_active = true);

create policy "Public can read active categories"
  on public.categories for select
  using (is_active = true);

create policy "Public can read published products"
  on public.products for select
  using (status = 'published' and is_active = true);

create policy "Public can read product images"
  on public.product_images for select
  using (true);

create policy "Public can read product categories"
  on public.product_categories for select
  using (true);

create policy "Public can read product highlights"
  on public.product_highlights for select
  using (true);

create policy "Public can read product attributes"
  on public.product_attributes for select
  using (true);

create policy "Public can read active campaigns"
  on public.campaigns for select
  using (is_active = true);

create policy "Public can read active coupons"
  on public.coupons for select
  using (is_active = true);

create policy "Public can read active payment methods"
  on public.payment_methods for select
  using (is_active = true);

create policy "Public can read active home slides"
  on public.home_slides for select
  using (is_active = true);

create policy "Public can read home video settings"
  on public.home_video_settings for select
  using (is_active = true);

create policy "Public can read active project references"
  on public.project_references for select
  using (is_active = true);

create policy "Public can read published policy pages"
  on public.policy_pages for select
  using (is_published = true);

-- ----------------------------------------------------------------------------
-- Müşteri kendi verilerine erişebilir (yalnızca kendi satırları)
-- ----------------------------------------------------------------------------
create policy "Customer can read own profile"
  on public.customer_profiles for select
  using (auth.uid() = user_id);

create policy "Customer can update own profile"
  on public.customer_profiles for update
  using (auth.uid() = user_id);

create policy "Customer can read own addresses"
  on public.customer_addresses for select
  using (auth.uid() = user_id);

create policy "Customer can insert own addresses"
  on public.customer_addresses for insert
  with check (auth.uid() = user_id);

create policy "Customer can update own addresses"
  on public.customer_addresses for update
  using (auth.uid() = user_id);

create policy "Customer can delete own addresses"
  on public.customer_addresses for delete
  using (auth.uid() = user_id);

create policy "Customer can read own favorites"
  on public.customer_favorites for select
  using (auth.uid() = user_id);

create policy "Customer can insert own favorites"
  on public.customer_favorites for insert
  with check (auth.uid() = user_id);

create policy "Customer can delete own favorites"
  on public.customer_favorites for delete
  using (auth.uid() = user_id);

create policy "Customer can read own cart"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy "Customer can insert own cart"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "Customer can update own cart"
  on public.cart_items for update
  using (auth.uid() = user_id);

create policy "Customer can delete own cart"
  on public.cart_items for delete
  using (auth.uid() = user_id);

create policy "Customer can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Customer can read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy "Customer can read own payment attempts"
  on public.payment_attempts for select
  using (auth.uid() = user_id);

create policy "Customer can insert inquiries"
  on public.customer_inquiries for insert
  with check (true);

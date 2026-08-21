-- ============================================================================
-- 24_customer_auth_hardening.sql
-- Müşteri oturumu uygunluğu ve yardımcı commerce tablolarının RLS koruması
-- ============================================================================

-- Müşteri yalnızca engelli değilse ve uygulama e-posta doğrulamasını
-- tamamladıysa aktif kabul edilir. Bu fonksiyon finansal portal politikalarının
-- yanı sıra aşağıdaki adres/favori/sepet politikalarının da tek doğruluk
-- kaynağıdır.
create or replace function public.is_customer_active(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.customer_profiles
    where user_id = check_user_id
      and is_blocked = false
      and email_verified_at is not null
  );
$$;

drop policy if exists "Customer can read own addresses" on public.customer_addresses;
create policy "Customer can read own addresses"
  on public.customer_addresses for select
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can insert own addresses" on public.customer_addresses;
create policy "Customer can insert own addresses"
  on public.customer_addresses for insert
  with check (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can update own addresses" on public.customer_addresses;
create policy "Customer can update own addresses"
  on public.customer_addresses for update
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()))
  with check (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can delete own addresses" on public.customer_addresses;
create policy "Customer can delete own addresses"
  on public.customer_addresses for delete
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own favorites" on public.customer_favorites;
create policy "Customer can read own favorites"
  on public.customer_favorites for select
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can insert own favorites" on public.customer_favorites;
create policy "Customer can insert own favorites"
  on public.customer_favorites for insert
  with check (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can delete own favorites" on public.customer_favorites;
create policy "Customer can delete own favorites"
  on public.customer_favorites for delete
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own cart" on public.cart_items;
create policy "Customer can read own cart"
  on public.cart_items for select
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can insert own cart" on public.cart_items;
create policy "Customer can insert own cart"
  on public.cart_items for insert
  with check (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can update own cart" on public.cart_items;
create policy "Customer can update own cart"
  on public.cart_items for update
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()))
  with check (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can delete own cart" on public.cart_items;
create policy "Customer can delete own cart"
  on public.cart_items for delete
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

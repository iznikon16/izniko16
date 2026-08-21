-- ============================================================================
-- 14_auth_data_protection.sql
-- Admin/customer hesap durumu ve finansal veriye erişim korumaları
-- ============================================================================

alter table public.admin_users
  add column if not exists is_active boolean not null default true;

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
  );
$$;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
      and is_active = true
  );
$$;

-- Pasif müşterinin doğrudan Supabase Data API üzerinden finansal verilere
-- erişmesini de engelle. Uygulama katmanındaki session kontrolünün DB karşılığıdır.
drop policy if exists "Customer can read own account" on public.customer_accounts;
create policy "Customer can read own account"
  on public.customer_accounts for select
  using (auth.uid() = customer_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own transactions" on public.account_transactions;
create policy "Customer can read own transactions"
  on public.account_transactions for select
  using (auth.uid() = customer_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own payments" on public.payments;
create policy "Customer can read own payments"
  on public.payments for select
  using (auth.uid() = customer_id and public.is_customer_active(auth.uid()));

-- Finansal geçmişe sahip müşteri profilinin yanlışlıkla silinmesini DB seviyesinde
-- de durdur. Uygulama artık fiziksel silme yerine is_blocked kullanır.
alter table public.customer_accounts
  drop constraint if exists customer_accounts_customer_id_fkey;
alter table public.customer_accounts
  add constraint customer_accounts_customer_id_fkey
  foreign key (customer_id) references public.customer_profiles (user_id) on delete restrict;

alter table public.account_transactions
  drop constraint if exists account_transactions_customer_id_fkey;
alter table public.account_transactions
  add constraint account_transactions_customer_id_fkey
  foreign key (customer_id) references public.customer_profiles (user_id) on delete restrict;

alter table public.payments
  drop constraint if exists payments_customer_id_fkey;
alter table public.payments
  add constraint payments_customer_id_fkey
  foreign key (customer_id) references public.customer_profiles (user_id) on delete restrict;

alter table public.customer_profiles
  drop constraint if exists customer_profiles_user_id_fkey;
alter table public.customer_profiles
  add constraint customer_profiles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete restrict;

-- Mevcut access token süresi dolmadan önce de pasif kullanıcıyı bütün müşteri
-- veri politikalarından çıkar.
drop policy if exists "Customer can read own profile" on public.customer_profiles;
create policy "Customer can read own profile"
  on public.customer_profiles for select
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can update own profile" on public.customer_profiles;
create policy "Customer can update own profile"
  on public.customer_profiles for update
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()))
  with check (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own orders" on public.orders;
create policy "Customer can read own orders"
  on public.orders for select
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own order items" on public.order_items;
create policy "Customer can read own order items"
  on public.order_items for select
  using (
    public.is_customer_active(auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Customer can read own payment attempts" on public.payment_attempts;
create policy "Customer can read own payment attempts"
  on public.payment_attempts for select
  using (auth.uid() = user_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own price list assignment" on public.customer_price_lists;
create policy "Customer can read own price list assignment"
  on public.customer_price_lists for select
  using (auth.uid() = customer_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own product prices" on public.customer_product_prices;
create policy "Customer can read own product prices"
  on public.customer_product_prices for select
  using (auth.uid() = customer_id and public.is_customer_active(auth.uid()));

drop policy if exists "Customer can read own discount" on public.customer_discounts;
create policy "Customer can read own discount"
  on public.customer_discounts for select
  using (auth.uid() = customer_id and public.is_customer_active(auth.uid()));

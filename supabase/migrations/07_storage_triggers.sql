-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE SETUP
-- 07_storage_triggers.sql — Storage bucket + auth trigger'ları
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Storage bucket: 'product-media' (product-images için kullanılır)
-- Supabase yeni projede bu bucket'ı otomatik oluşturmayabilir; elle çalıştır.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

-- Storage üzerinde public okuma izni (public bucket zaten public ama ek güvence):
create policy "Public can read product-media"
  on storage.objects for select
  using (bucket_id = 'product-media');

-- ----------------------------------------------------------------------------
-- handle_new_user: Yeni auth.users kaydında ilgili profili oluşturur
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Müşteri profili (otomatik oluştur)
  insert into public.customer_profiles (user_id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- handle_updated_at: updated_at kolonunu otomatik günceller (yardımcı fonksiyon)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

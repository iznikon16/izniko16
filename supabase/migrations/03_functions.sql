-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 03_functions.sql — Fonksiyonlar
-- ============================================================================

-- ----------------------------------------------------------------------------
-- generate_order_number: Race-condition'a dayanıklı unique sipariş numarası
-- ----------------------------------------------------------------------------
create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_number text;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    new_number := 'SP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    if not exists (select 1 from public.orders where order_number = new_number) then
      return new_number;
    end if;
    if attempt > 10 then
      raise exception 'Sipariş numarası üretilemedi';
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- is_admin: Kullanıcının admin olup olmadığını kontrol eder
-- ----------------------------------------------------------------------------
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = check_user_id
  );
$$;

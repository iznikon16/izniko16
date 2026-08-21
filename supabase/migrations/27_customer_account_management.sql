-- ============================================================================
-- 27_customer_account_management.sql
-- Müşteri adreslerinde tek varsayılan kaydı ve atomik mutation akışlarını sağlar.
-- ============================================================================

with ranked_defaults as (
  select
    id,
    row_number() over (partition by user_id order by updated_at desc, created_at desc, id desc) as default_rank
  from public.customer_addresses
  where is_default = true
)
update public.customer_addresses as address
set is_default = false
from ranked_defaults
where address.id = ranked_defaults.id
  and ranked_defaults.default_rank > 1;

create unique index if not exists uq_customer_addresses_one_default
  on public.customer_addresses (user_id)
  where is_default = true;

create or replace function public.save_customer_address(
  p_id uuid,
  p_label text,
  p_full_name text,
  p_phone text,
  p_city text,
  p_district text,
  p_neighborhood text,
  p_address_line text,
  p_postal_code text,
  p_is_default boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_address_id uuid;
  v_make_default boolean;
  v_affected integer;
begin
  if v_user_id is null or not public.is_customer_active(v_user_id) then
    raise exception 'Aktif müşteri oturumu gerekli.';
  end if;

  if nullif(btrim(p_full_name), '') is null
    or nullif(btrim(p_phone), '') is null
    or nullif(btrim(p_city), '') is null
    or nullif(btrim(p_district), '') is null
    or nullif(btrim(p_address_line), '') is null then
    raise exception 'Ad soyad, telefon, şehir, ilçe ve açık adres zorunludur.';
  end if;

  perform 1
  from public.customer_addresses
  where user_id = v_user_id
  for update;

  v_make_default := coalesce(p_is_default, false)
    or not exists (select 1 from public.customer_addresses where user_id = v_user_id);

  if v_make_default then
    update public.customer_addresses
    set is_default = false
    where user_id = v_user_id and is_default = true;
  end if;

  if p_id is null then
    insert into public.customer_addresses (
      user_id, label, full_name, phone, city, district, neighborhood,
      address_line, postal_code, is_default
    ) values (
      v_user_id,
      coalesce(nullif(btrim(p_label), ''), 'Teslimat'),
      btrim(p_full_name), btrim(p_phone), btrim(p_city), btrim(p_district),
      coalesce(btrim(p_neighborhood), ''), btrim(p_address_line),
      coalesce(btrim(p_postal_code), ''), v_make_default
    )
    returning id into v_address_id;
  else
    update public.customer_addresses
    set
      label = coalesce(nullif(btrim(p_label), ''), 'Teslimat'),
      full_name = btrim(p_full_name),
      phone = btrim(p_phone),
      city = btrim(p_city),
      district = btrim(p_district),
      neighborhood = coalesce(btrim(p_neighborhood), ''),
      address_line = btrim(p_address_line),
      postal_code = coalesce(btrim(p_postal_code), ''),
      is_default = case when v_make_default then true else is_default end
    where id = p_id and user_id = v_user_id
    returning id into v_address_id;

    get diagnostics v_affected = row_count;
    if v_affected = 0 then
      raise exception 'Adres bulunamadı.';
    end if;
  end if;

  return v_address_id;
end;
$$;

create or replace function public.set_default_customer_address(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_customer_active(v_user_id) then
    raise exception 'Aktif müşteri oturumu gerekli.';
  end if;

  if not exists (
    select 1 from public.customer_addresses where id = p_id and user_id = v_user_id
  ) then
    return false;
  end if;

  perform 1 from public.customer_addresses where user_id = v_user_id for update;
  update public.customer_addresses set is_default = false
  where user_id = v_user_id and is_default = true and id <> p_id;
  update public.customer_addresses set is_default = true
  where id = p_id and user_id = v_user_id;
  return true;
end;
$$;

create or replace function public.delete_customer_address(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_was_default boolean;
begin
  if v_user_id is null or not public.is_customer_active(v_user_id) then
    raise exception 'Aktif müşteri oturumu gerekli.';
  end if;

  select is_default into v_was_default
  from public.customer_addresses
  where id = p_id and user_id = v_user_id
  for update;

  if not found then
    return false;
  end if;

  delete from public.customer_addresses where id = p_id and user_id = v_user_id;

  if v_was_default then
    update public.customer_addresses
    set is_default = true
    where id = (
      select id from public.customer_addresses
      where user_id = v_user_id
      order by updated_at desc, created_at desc, id desc
      limit 1
    );
  end if;

  return true;
end;
$$;

revoke all on function public.save_customer_address(uuid,text,text,text,text,text,text,text,text,boolean) from public, anon;
revoke all on function public.set_default_customer_address(uuid) from public, anon;
revoke all on function public.delete_customer_address(uuid) from public, anon;
grant execute on function public.save_customer_address(uuid,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.set_default_customer_address(uuid) to authenticated;
grant execute on function public.delete_customer_address(uuid) to authenticated;

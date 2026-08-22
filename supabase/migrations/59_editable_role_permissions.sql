create or replace function public.set_editable_role_permissions(
  p_role_name text,
  p_permission_keys text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_inserted integer := 0;
begin
  if not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and (role = 'admin' or is_super_admin = true)
  ) then
    raise exception 'Bu işlem yalnızca Süper Admin tarafından yapılabilir.' using errcode = '42501';
  end if;

  if p_role_name not in ('staff', 'customer') then
    raise exception 'Bu rolün izinleri düzenlenemez.' using errcode = '22023';
  end if;

  if coalesce(array_length(p_permission_keys, 1), 0) > 250 then
    raise exception 'Çok fazla izin gönderildi.' using errcode = '22023';
  end if;

  if 'role.manage' = any(coalesce(p_permission_keys, array[]::text[])) then
    raise exception 'Rol yönetimi izni alt rollere atanamaz.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_permission_keys, array[]::text[])) requested(key)
    left join public.permissions permission on permission.key = requested.key
    where permission.id is null
  ) then
    raise exception 'Geçersiz izin anahtarı gönderildi.' using errcode = '22023';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name
  for update;

  if v_role_id is null then
    raise exception 'Rol bulunamadı.' using errcode = 'P0002';
  end if;

  delete from public.role_permissions where role_id = v_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, permission.id
  from public.permissions permission
  where permission.key = any(coalesce(p_permission_keys, array[]::text[]))
    and permission.key <> 'role.manage';

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.set_editable_role_permissions(text, text[]) from public, anon;
grant execute on function public.set_editable_role_permissions(text, text[]) to authenticated;

notify pgrst, 'reload schema';

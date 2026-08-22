insert into public.permissions (key, description)
values ('role.manage', 'Yetkili rol izinlerini yönetme')
on conflict (key) do update set description = excluded.description;

create or replace function public.set_staff_role_permissions(p_permission_keys text[])
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
    select 1 from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and (role = 'admin' or is_super_admin = true)
  ) then
    raise exception 'Bu işlem yalnızca Süper Admin tarafından yapılabilir.' using errcode = '42501';
  end if;

  if coalesce(array_length(p_permission_keys, 1), 0) > 250 then
    raise exception 'Çok fazla izin gönderildi.' using errcode = '22023';
  end if;

  select id into v_role_id from public.roles where name = 'staff' for update;
  if v_role_id is null then raise exception 'Yetkili rolü bulunamadı.'; end if;

  if exists (
    select 1 from unnest(coalesce(p_permission_keys, array[]::text[])) requested(key)
    left join public.permissions permission on permission.key = requested.key
    where permission.id is null
  ) then
    raise exception 'Geçersiz izin anahtarı gönderildi.' using errcode = '22023';
  end if;

  delete from public.role_permissions where role_id = v_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, permission.id
  from public.permissions permission
  where permission.key = any(coalesce(p_permission_keys, array[]::text[]));
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.set_staff_role_permissions(text[]) from public, anon;
grant execute on function public.set_staff_role_permissions(text[]) to authenticated;

notify pgrst, 'reload schema';

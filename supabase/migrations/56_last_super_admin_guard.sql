-- Backend `admin` rolü Süper Admin'dir. `is_super_admin` yalnızca eski
-- kayıtlarla uyumluluk için aynı korumaya dahil edilir.
create or replace function public.protect_last_active_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_is_super boolean;
  v_new_is_super boolean := false;
  v_active_super_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('admin_users:last_active_super_admin'));

  v_old_is_super := old.is_active and (old.role = 'admin' or old.is_super_admin);
  if tg_op = 'UPDATE' then
    v_new_is_super := new.is_active and (new.role = 'admin' or new.is_super_admin);
  end if;

  if v_old_is_super and not v_new_is_super then
    select count(*) into v_active_super_count
    from public.admin_users
    where is_active = true and (role = 'admin' or is_super_admin = true);

    if v_active_super_count <= 1 then
      raise exception 'Sistemde en az bir aktif Süper Admin kalmalıdır.' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_last_active_super_admin_trigger on public.admin_users;
create trigger protect_last_active_super_admin_trigger
  before update of role, is_active, is_super_admin or delete
  on public.admin_users
  for each row execute function public.protect_last_active_super_admin();

revoke all on function public.protect_last_active_super_admin() from public;

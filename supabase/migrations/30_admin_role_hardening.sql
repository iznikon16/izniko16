-- Admin panel access is reserved for active admin/staff records.
-- A customer role must never become an admin session merely because an
-- admin_users row exists from legacy data.
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
      and role in ('admin', 'staff')
  );
$$;

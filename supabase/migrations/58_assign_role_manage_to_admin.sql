insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'role.manage'
where role.name = 'admin'
on conflict do nothing;

begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  exists(
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key = 'product.view'
  ),
  'staff can see and use the product module'
);

select ok(
  exists(
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key = 'report.view'
  ),
  'staff can see permitted reports'
);

select ok(
  not exists(
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key in ('audit.view', 'settings.manageIntegrations', 'user.manage')
  ),
  'staff does not receive critical administration permissions'
);

select is(
  (
    select count(*) from public.permissions p
    where not exists (
      select 1 from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      where rp.permission_id = p.id and r.name = 'admin'
    )
  ),
  0::bigint,
  'admin role is assigned every registered permission'
);

select * from finish();
rollback;

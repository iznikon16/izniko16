begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select has_table('public', 'integration_health_checks', 'integration health history exists');

select ok(
  exists (select 1 from public.permissions where key = 'settings.manageIntegrations'),
  'integration management permission is seeded'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'admin' and p.key = 'settings.manageIntegrations'
  ),
  'admin receives integration management permission'
);

select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'staff' and p.key = 'settings.manageIntegrations'
  ),
  'staff does not receive secret management by default'
);

select * from finish();
rollback;

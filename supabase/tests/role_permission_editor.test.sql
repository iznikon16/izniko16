begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('59000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'role-admin@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('59000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'role-staff@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.admin_users (user_id, email, full_name, role, is_active, is_super_admin)
values
  ('59000000-0000-0000-0000-000000000001', 'role-admin@example.test', 'Role Admin', 'admin', true, true),
  ('59000000-0000-0000-0000-000000000002', 'role-staff@example.test', 'Role Staff', 'staff', true, false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"59000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.set_editable_role_permissions('staff', array['product.view']), 1, 'Super Admin can update staff permissions');
select is(public.set_editable_role_permissions('customer', array['account.view']), 1, 'Super Admin can update customer permissions');
select throws_ok($$select public.set_editable_role_permissions('admin', array['product.view'])$$, '22023', null, 'admin role cannot be edited');
select throws_ok($$select public.set_editable_role_permissions('staff', array['role.manage'])$$, '42501', null, 'role management permission cannot be delegated');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"59000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.set_editable_role_permissions('customer', array['account.view'])$$, '42501', null, 'staff cannot edit role permissions');
reset role;

select ok(not has_function_privilege('anon', 'public.set_editable_role_permissions(text,text[])', 'EXECUTE'), 'anonymous role cannot execute role editor RPC');

select * from finish();
rollback;

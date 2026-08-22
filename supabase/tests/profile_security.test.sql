begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('58000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'avatar-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('58000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'avatar-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('58000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.customer_profiles (user_id, email, full_name, email_verified_at)
values
  ('58000000-0000-0000-0000-000000000001', 'avatar-a@example.test', 'Avatar A', now()),
  ('58000000-0000-0000-0000-000000000002', 'avatar-b@example.test', 'Avatar B', now())
on conflict (user_id) do update set email_verified_at = excluded.email_verified_at;

insert into public.admin_users (user_id, email, full_name, role, is_active, is_super_admin)
values
  ('58000000-0000-0000-0000-000000000001', 'avatar-a@example.test', 'Super A', 'admin', true, true),
  ('58000000-0000-0000-0000-000000000003', 'staff@example.test', 'Staff', 'staff', true, false)
on conflict (user_id) do update set role = excluded.role, is_active = true, is_super_admin = excluded.is_super_admin;

select ok(exists(select 1 from storage.buckets where id = 'profile-avatars' and public), 'profile avatar bucket exists and is readable');
select is((select file_size_limit from storage.buckets where id = 'profile-avatars'), 5242880::bigint, 'avatar bucket enforces 5 MB limit');
select ok((select allowed_mime_types @> array['image/jpeg','image/png','image/webp'] from storage.buckets where id = 'profile-avatars'), 'avatar bucket restricts MIME types');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"58000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$insert into storage.objects (bucket_id, name) values ('profile-avatars', '58000000-0000-0000-0000-000000000001/avatar-test.png')$$, 'user can insert an object under own avatar folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('profile-avatars', '58000000-0000-0000-0000-000000000002/avatar-test.png')$$, '42501', null, 'user cannot insert under another avatar folder');
reset role;

select throws_ok($$update public.customer_profiles set avatar_path = '58000000-0000-0000-0000-000000000002/avatar.png' where user_id = '58000000-0000-0000-0000-000000000001'$$, '23514', null, 'profile cannot reference another user avatar path');
select lives_ok($$update public.customer_profiles set avatar_path = '58000000-0000-0000-0000-000000000001/avatar.png' where user_id = '58000000-0000-0000-0000-000000000001'$$, 'profile can reference own avatar path');

select throws_ok($$update public.admin_users set is_active = false where user_id = '58000000-0000-0000-0000-000000000001'$$, '23514', 'Sistemde en az bir aktif Süper Admin kalmalıdır.', 'last active Super Admin cannot be disabled');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"58000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.set_staff_role_permissions(array['product.view']), 1, 'Super Admin updates staff permissions transactionally');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"58000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.set_staff_role_permissions(array['product.view'])$$, '42501', 'Bu işlem yalnızca Süper Admin tarafından yapılabilir.', 'staff cannot edit its own permissions');
reset role;

select ok(not has_function_privilege('anon', 'public.set_staff_role_permissions(text[])', 'EXECUTE'), 'anonymous role cannot execute permission editor RPC');

select * from finish();
rollback;

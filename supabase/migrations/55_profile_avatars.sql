-- Kullanıcı avatarları ürün medyasından ayrı tutulur. Veritabanında yalnızca
-- stable object path saklanır; signed/public URL saklanmaz.
alter table public.customer_profiles
  add column if not exists avatar_path text;

alter table public.admin_users
  add column if not exists avatar_path text;

alter table public.customer_profiles
  drop constraint if exists customer_profiles_avatar_path_owner_check,
  add constraint customer_profiles_avatar_path_owner_check
    check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id::text);

alter table public.admin_users
  drop constraint if exists admin_users_avatar_path_owner_check,
  add constraint admin_users_avatar_path_owner_check
    check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read profile avatars" on storage.objects;
create policy "Public can read profile avatars"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "Users can upload own profile avatars" on storage.objects;
create policy "Users can upload own profile avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own profile avatars" on storage.objects;
create policy "Users can update own profile avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own profile avatars" on storage.objects;
create policy "Users can delete own profile avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on column public.customer_profiles.avatar_path is 'Stable profile-avatars object path owned by user_id.';
comment on column public.admin_users.avatar_path is 'Stable profile-avatars object path owned by user_id.';

notify pgrst, 'reload schema';

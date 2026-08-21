-- GitHub Sync Configuration Table
create table if not exists public.github_sync_config (
  id uuid primary key default gen_random_uuid(),
  github_owner text not null,
  github_repository text not null,
  github_branch text not null default 'main',
  encrypted_token text not null,
  last_connection_check timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure only one config row exists (Singleton pattern via unique constraint or just check in app)
-- We'll allow multiple configs later if needed, but for now we assume a single central sync config.
create unique index if not exists github_sync_config_single_row_idx on public.github_sync_config ((true));

-- GitHub Sync Operations Log Table
create table if not exists public.github_sync_logs (
  id uuid primary key default gen_random_uuid(),
  operation_type text not null, -- FETCH, PUSH, PULL, ROLLBACK, CONNECTION_TEST
  status text not null, -- SUCCESS, FAILED, WARNING, IN_PROGRESS
  actor_user_id uuid,
  branch text,
  from_commit text,
  to_commit text,
  message text,
  error_code text,
  error_message_safe text,
  duration_ms integer,
  started_at timestamptz default now() not null,
  completed_at timestamptz
);

-- An earlier version of this table used commit_hash, error_message and
-- triggered_by. Keep those columns and add the current schema without losing
-- existing log records.
alter table public.github_sync_logs
  add column if not exists actor_user_id uuid,
  add column if not exists branch text,
  add column if not exists from_commit text,
  add column if not exists to_commit text,
  add column if not exists message text,
  add column if not exists error_code text,
  add column if not exists error_message_safe text,
  add column if not exists duration_ms integer;

alter table public.github_sync_logs
  alter column started_at set default now();
update public.github_sync_logs
  set started_at = now()
  where started_at is null;
alter table public.github_sync_logs
  alter column started_at set not null;

-- GitHub operations are initiated by Supabase Auth users.
-- Defining the constraint separately also repairs partially applied attempts.
alter table public.github_sync_logs
  drop constraint if exists github_sync_logs_actor_user_id_fkey;
alter table public.github_sync_logs
  add constraint github_sync_logs_actor_user_id_fkey
  foreign key (actor_user_id) references auth.users(id) on delete set null;

-- Add updated_at trigger for config
drop trigger if exists update_github_sync_config_updated_at on public.github_sync_config;
create trigger update_github_sync_config_updated_at
  before update on public.github_sync_config
  for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.github_sync_config enable row level security;
alter table public.github_sync_logs enable row level security;

-- Only super_admin or admin can access config and logs
drop policy if exists "Admins can view and edit github sync config"
  on public.github_sync_config;
create policy "Admins can view and edit github sync config"
  on public.github_sync_config
  for all
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
      and (admin_users.is_super_admin or admin_users.role = 'admin')
    )
  );

drop policy if exists "Admins can view and insert github sync logs"
  on public.github_sync_logs;
create policy "Admins can view and insert github sync logs"
  on public.github_sync_logs
  for all
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
      and (admin_users.is_super_admin or admin_users.role = 'admin')
    )
  );

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
  actor_user_id uuid references public.users(id) on delete set null,
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

-- Add updated_at trigger for config
create trigger update_github_sync_config_updated_at
  before update on public.github_sync_config
  for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.github_sync_config enable row level security;
alter table public.github_sync_logs enable row level security;

-- Only super_admin or admin can access config and logs
create policy "Admins can view and edit github sync config"
  on public.github_sync_config
  for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('super_admin', 'admin')
    )
  );

create policy "Admins can view and insert github sync logs"
  on public.github_sync_logs
  for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('super_admin', 'admin')
    )
  );

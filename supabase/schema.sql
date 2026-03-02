-- ============================================================
-- TaskFlow – Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- Safe to re-run: drops everything first, then recreates.
-- ============================================================

-- ============================================================
-- RESET (drop in reverse-dependency order)
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists tasks_updated_at on public.tasks;
drop trigger if exists projects_updated_at on public.projects;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_updated_at() cascade;
drop function if exists public.get_task_stats(uuid) cascade;
drop function if exists public.ensure_user_workspace() cascade;
drop function if exists public.is_workspace_member(uuid) cascade;
drop function if exists public.is_workspace_admin(uuid) cascade;

drop table if exists public.task_tags cascade;
drop table if exists public.tags cascade;
drop table if exists public.comments cascade;
drop table if exists public.tasks cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;
drop table if exists public.workspace_invites cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- PROFILES (mirrors auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ============================================================
-- WORKSPACES
-- ============================================================
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  owner_id    uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now() not null
);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  role          text check (role in ('owner', 'admin', 'member')) default 'member' not null,
  created_at    timestamptz default now() not null,
  unique (workspace_id, user_id)
);

-- Helper functions (defined BEFORE any policy that references them)
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- RLS policies for workspaces (after workspace_members exists)
alter table public.workspaces enable row level security;

create policy "Workspace members can view workspace" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "Owner can insert workspace" on public.workspaces
  for insert with check (owner_id = auth.uid());

create policy "Owner can update workspace" on public.workspaces
  for update using (owner_id = auth.uid());

-- RLS policies for workspace_members
alter table public.workspace_members enable row level security;

create policy "Members can view workspace members" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "Owner can insert self as member" on public.workspace_members
  for insert with check (
    user_id = auth.uid()
    or public.is_workspace_admin(workspace_id)
  );

-- ============================================================
-- WORKSPACE INVITES
-- ============================================================
create table public.workspace_invites (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade not null,
  email         text not null,
  role          text check (role in ('admin', 'member')) default 'member' not null,
  token         text unique not null,
  expires_at    timestamptz not null,
  created_at    timestamptz default now() not null
);

alter table public.workspace_invites enable row level security;

create policy "Admins can manage invites" on public.workspace_invites
  for all using (public.is_workspace_admin(workspace_id));

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade not null,
  name          text not null,
  description   text,
  color         text default '#6366f1' not null,
  created_by    uuid references public.profiles(id) not null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

alter table public.projects enable row level security;

create policy "Workspace members can view projects" on public.projects
  for select using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

create policy "Workspace members can insert projects" on public.projects
  for insert with check (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

create policy "Project admins can update projects" on public.projects
  for update using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

create policy "Project creators can delete projects" on public.projects
  for delete using (created_by = auth.uid());

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  role        text check (role in ('admin', 'member')) default 'member' not null,
  created_at  timestamptz default now() not null,
  unique (project_id, user_id)
);

alter table public.project_members enable row level security;

create policy "Project members can view project members" on public.project_members
  for select using (
    project_id in (
      select id from public.projects where workspace_id in (
        select workspace_id from public.workspace_members where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete cascade not null,
  title         text not null,
  description   text,
  status        text check (status in ('todo', 'in_progress', 'in_review', 'done')) default 'todo' not null,
  priority      text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium' not null,
  due_date      timestamptz,
  assignee_id   uuid references public.profiles(id) on delete set null,
  created_by    uuid references public.profiles(id) not null,
  position      integer default 0 not null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

alter table public.tasks enable row level security;

create policy "Workspace members can view tasks" on public.tasks
  for select using (
    project_id in (
      select id from public.projects where workspace_id in (
        select workspace_id from public.workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "Workspace members can insert tasks" on public.tasks
  for insert with check (
    project_id in (
      select id from public.projects where workspace_id in (
        select workspace_id from public.workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "Workspace members can update tasks" on public.tasks
  for update using (
    project_id in (
      select id from public.projects where workspace_id in (
        select workspace_id from public.workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "Task creator can delete tasks" on public.tasks
  for delete using (
    project_id in (
      select id from public.projects where workspace_id in (
        select workspace_id from public.workspace_members where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- COMMENTS
-- ============================================================
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.comments enable row level security;

create policy "Workspace members can view comments" on public.comments
  for select using (
    task_id in (
      select id from public.tasks where project_id in (
        select id from public.projects where workspace_id in (
          select workspace_id from public.workspace_members where user_id = auth.uid()
        )
      )
    )
  );

create policy "Users can insert comments" on public.comments
  for insert with check (user_id = auth.uid());

create policy "Users can update own comments" on public.comments
  for update using (user_id = auth.uid());

create policy "Users can delete own comments" on public.comments
  for delete using (user_id = auth.uid());

-- ============================================================
-- TAGS
-- ============================================================
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text not null,
  color       text default '#6366f1' not null,
  created_at  timestamptz default now() not null,
  unique (project_id, name)
);

alter table public.tags enable row level security;

create policy "Workspace members can view tags" on public.tags
  for select using (true);

create policy "Workspace members can manage tags" on public.tags
  for all using (true);

-- ============================================================
-- TASK TAGS
-- ============================================================
create table public.task_tags (
  task_id  uuid references public.tasks(id) on delete cascade not null,
  tag_id   uuid references public.tags(id) on delete cascade not null,
  primary key (task_id, tag_id)
);

alter table public.task_tags enable row level security;

create policy "Workspace members can manage task tags" on public.task_tags
  for all using (true);

-- ============================================================
-- REALTIME – enable on key tables
-- ============================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.workspace_members;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  workspace_name text;
  workspace_id   uuid;
  workspace_slug text;
begin
  -- Insert profile
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );

  -- Create default workspace
  workspace_name := coalesce(new.raw_user_meta_data->>'workspace_name', 'My Workspace');
  workspace_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(new.id::text, 1, 8);
  workspace_id   := gen_random_uuid();

  insert into public.workspaces (id, name, slug, owner_id)
  values (workspace_id, workspace_name, workspace_slug, new.id);

  -- Add as owner
  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create trigger projects_updated_at before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- Ensure a workspace exists for the calling user (used as fallback when trigger didn't fire)
-- security definer = runs as function owner, bypasses RLS
create or replace function public.ensure_user_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_slug         text;
  v_email        text;
  v_full_name    text;
begin
  -- 1. Ensure profile exists (trigger may not have fired)
  select email into v_email from auth.users where id = auth.uid();
  select raw_user_meta_data->>'full_name' into v_full_name
    from auth.users where id = auth.uid();

  insert into public.profiles (id, email, full_name)
  values (auth.uid(), coalesce(v_email, ''), v_full_name)
  on conflict (id) do nothing;

  -- 2. Return existing workspace if already a member
  select workspace_id into v_workspace_id
  from public.workspace_members
  where user_id = auth.uid()
  limit 1;

  if v_workspace_id is not null then
    return v_workspace_id;
  end if;

  -- 3. Check if workspace owned by user exists but membership is missing
  select id into v_workspace_id
  from public.workspaces
  where owner_id = auth.uid()
  limit 1;

  if v_workspace_id is null then
    -- Create a new workspace
    v_slug := 'workspace-' || substr(auth.uid()::text, 1, 8);
    v_workspace_id := gen_random_uuid();
    insert into public.workspaces (id, name, slug, owner_id)
    values (v_workspace_id, 'My Workspace', v_slug, auth.uid());
  end if;

  -- 4. Ensure membership row exists
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, auth.uid(), 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return v_workspace_id;
end;
$$;

-- Task stats RPC
create or replace function public.get_task_stats(user_id uuid)
returns table (total bigint, done bigint, in_progress bigint, overdue bigint)
language sql security definer as $$
  select
    count(*)                                                                           as total,
    count(*) filter (where t.status = 'done')                                         as done,
    count(*) filter (where t.status = 'in_progress')                                  as in_progress,
    count(*) filter (where t.due_date < now() and t.status != 'done')                 as overdue
  from public.tasks t
  join public.projects p on t.project_id = p.id
  join public.workspace_members wm on p.workspace_id = wm.workspace_id
  where wm.user_id = $1;
$$;

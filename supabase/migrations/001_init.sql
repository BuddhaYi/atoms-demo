-- Atoms Demo Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles table (auto-created on auth signup)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Projects table
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled Project',
  description text,
  category text,
  status text default 'active' check (status in ('active', 'archived')),
  is_public boolean default false,
  current_version_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Code versions table
create table if not exists code_versions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  version_number integer not null,
  files jsonb not null default '{}'::jsonb,
  prompt text,
  agent_name text,
  model_used text,
  tokens_used integer default 0,
  created_at timestamptz default now() not null,
  unique (project_id, version_number)
);

-- Chat messages table
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  role text not null check (role in ('user', 'agent', 'system')),
  agent_name text,
  content text not null default '',
  content_type text default 'text' check (content_type in ('text', 'feature_list', 'architecture', 'code', 'data_insight')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_code_versions_project_id on code_versions(project_id);
create index if not exists idx_chat_messages_project_id on chat_messages(project_id);
create index if not exists idx_chat_messages_created_at on chat_messages(created_at);

-- RLS Policies
alter table profiles enable row level security;
alter table projects enable row level security;
alter table code_versions enable row level security;
alter table chat_messages enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Projects: users can CRUD their own projects, read public projects
create policy "Users can view own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can view public projects" on projects for select using (is_public = true);
create policy "Users can insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on projects for delete using (auth.uid() = user_id);

-- Code versions: access through project ownership
create policy "Users can view versions of own projects" on code_versions for select
  using (exists (select 1 from projects where projects.id = code_versions.project_id and projects.user_id = auth.uid()));
create policy "Users can insert versions to own projects" on code_versions for insert
  with check (exists (select 1 from projects where projects.id = code_versions.project_id and projects.user_id = auth.uid()));

-- Chat messages: access through project ownership
create policy "Users can view messages of own projects" on chat_messages for select
  using (exists (select 1 from projects where projects.id = chat_messages.project_id and projects.user_id = auth.uid()));
create policy "Users can insert messages to own projects" on chat_messages for insert
  with check (exists (select 1 from projects where projects.id = chat_messages.project_id and projects.user_id = auth.uid()));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-creating profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on projects for each row execute function update_updated_at();

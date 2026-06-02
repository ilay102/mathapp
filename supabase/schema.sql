-- MathPad schema
-- Run in Supabase SQL editor (one-shot).

create extension if not exists "pgcrypto";

-- Notebooks: a course/folder for the student.
create table if not exists notebooks (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notebooks_owner_idx on notebooks(owner, updated_at desc);

-- Pages: one math problem + work, lives in a notebook.
create table if not exists pages (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks(id) on delete cascade,
  owner       uuid not null references auth.users(id) on delete cascade,
  problem     text not null default '',
  strokes     jsonb not null default '[]'::jsonb,
  ocr_lines   jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pages_notebook_idx on pages(notebook_id, updated_at desc);

-- Checks: every time the student taps "Check my work".
create table if not exists checks (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references pages(id) on delete cascade,
  owner       uuid not null references auth.users(id) on delete cascade,
  problem     text not null,
  student_lines jsonb not null,
  result      jsonb not null,
  model       text not null default 'deepseek-v4-flash',
  latency_ms  int,
  created_at  timestamptz not null default now()
);
create index if not exists checks_owner_day_idx on checks(owner, created_at desc);

-- Daily usage view for quota enforcement.
create or replace view daily_check_count as
select owner,
       date_trunc('day', created_at at time zone 'utc') as day,
       count(*) as n
from checks
group by owner, day;

-- RLS
alter table notebooks enable row level security;
alter table pages     enable row level security;
alter table checks    enable row level security;

drop policy if exists notebooks_owner_all on notebooks;
create policy notebooks_owner_all on notebooks
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists pages_owner_all on pages;
create policy pages_owner_all on pages
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists checks_owner_all on checks;
create policy checks_owner_all on checks
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- updated_at trigger
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists notebooks_touch on notebooks;
create trigger notebooks_touch before update on notebooks
  for each row execute function touch_updated_at();

drop trigger if exists pages_touch on pages;
create trigger pages_touch before update on pages
  for each row execute function touch_updated_at();

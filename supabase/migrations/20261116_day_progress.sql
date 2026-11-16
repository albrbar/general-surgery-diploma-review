-- GSDIPLOMAREVISION: durable Day 1–Day 16 progress
-- Run this migration in the Supabase SQL editor for the project used by the portal.

create table if not exists public.day_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 16),
  answered integer not null default 0 check (answered between 0 and 80),
  correct integer not null default 0 check (correct between 0 and 80),
  total integer not null default 80 check (total between 1 and 80),
  last_question integer not null default 0 check (last_question between 0 and 80),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day_number)
);

alter table public.day_progress enable row level security;

drop policy if exists "Students can read their own day progress" on public.day_progress;
drop policy if exists "Students can insert their own day progress" on public.day_progress;
drop policy if exists "Students can update their own day progress" on public.day_progress;

create policy "Students can read their own day progress"
  on public.day_progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Students can insert their own day progress"
  on public.day_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Students can update their own day progress"
  on public.day_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists day_progress_updated_at on public.day_progress;
create trigger day_progress_updated_at
before update on public.day_progress
for each row execute function public.set_updated_at();

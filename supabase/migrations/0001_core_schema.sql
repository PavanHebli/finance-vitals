-- Vitals — core schema (profiles, snapshots, budget_cards, distribution_log,
-- goals, user_settings, active_sessions)
-- See BACKEND_PLAN.md for the design rationale behind each table.
--
-- Run this in the Supabase SQL editor for your project. Safe to re-run —
-- every statement is guarded with IF NOT EXISTS / OR REPLACE.

-- ============================================================================
-- profiles
-- ============================================================================

create table if not exists profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text,
  avatar_url         text,
  date_of_birth      date,
  gender             text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  country            text,
  city               text,
  plan               text not null default 'free' check (plan in ('free', 'pro')),
  plan_expires       timestamptz,
  profile_completed  boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Auto-create a profiles row whenever a new auth.users row is created, so
-- the app never has to do it manually (and can't race with a first write).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- snapshots
-- ============================================================================

create table if not exists snapshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  version    text,
  score      integer,
  inputs     jsonb not null,
  outputs    jsonb not null,
  saved_at   timestamptz not null default now()
);

create index if not exists idx_snapshots_user_saved_at
  on snapshots (user_id, saved_at desc);

-- ============================================================================
-- budget_cards
-- ============================================================================

create table if not exists budget_cards (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  label             text not null,
  type              text not null check (type in ('income', 'cash', 'custom')),
  allocation_mode   text not null check (allocation_mode in ('percent', 'fixed', 'remainder')),
  allocation_value  numeric not null default 0,
  balance           numeric not null default 0,
  paused            boolean not null default false,
  color             text not null,
  purpose           text check (purpose in ('expense', 'saving')),
  description       text,
  goal_amount       numeric,
  saved_so_far      numeric,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_budget_cards_user_sort
  on budget_cards (user_id, sort_order);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_budget_cards_updated_at on budget_cards;
create trigger trg_budget_cards_updated_at
  before update on budget_cards
  for each row execute function set_updated_at();

-- ============================================================================
-- distribution_log
-- ============================================================================

create table if not exists distribution_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  income_amount  numeric not null,
  allocations    jsonb not null,
  timestamp      timestamptz not null default now()
);

create index if not exists idx_distribution_log_user_timestamp
  on distribution_log (user_id, timestamp desc);

-- ============================================================================
-- goals
-- ============================================================================

create table if not exists goals (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  type                   text not null check (type in ('metric', 'savings')),
  -- metric goals only
  metric                 text check (metric in ('savings_rate', 'debt_to_income', 'emergency_fund_months', 'housing_ratio')),
  label                  text,
  target                 numeric,
  direction              text check (direction in ('up', 'down')),
  baseline               numeric,
  -- savings goals only
  name                   text,
  target_amount          numeric,
  saved_so_far           numeric,
  monthly_contribution   numeric,
  target_date            date,
  -- shared
  set_month              text,
  created_at             timestamptz not null default now()
);

create index if not exists idx_goals_user on goals (user_id);

-- ============================================================================
-- user_settings
-- ============================================================================

create table if not exists user_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  color_scheme   text not null default 'vitals' check (color_scheme in ('vitals', 'forest', 'ocean', 'dusk', 'rose')),
  dark_mode      text not null default 'system' check (dark_mode in ('system', 'light', 'dark')),
  notifications  boolean not null default true,
  checkin_day    integer check (checkin_day between 0 and 6),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_user_settings_updated_at on user_settings;
create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

-- ============================================================================
-- active_sessions
-- ============================================================================

create table if not exists active_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  device_label  text,
  device_id     text not null,
  created_at    timestamptz not null default now(),
  last_active   timestamptz not null default now(),
  revoked_at    timestamptz
);

create index if not exists idx_active_sessions_user_revoked
  on active_sessions (user_id, revoked_at);

create unique index if not exists idx_active_sessions_user_device
  on active_sessions (user_id, device_id);

-- ============================================================================
-- Row Level Security — every table, same pattern: a row is only visible to
-- the user it belongs to.
-- ============================================================================

alter table profiles         enable row level security;
alter table snapshots        enable row level security;
alter table budget_cards     enable row level security;
alter table distribution_log enable row level security;
alter table goals            enable row level security;
alter table user_settings    enable row level security;
alter table active_sessions  enable row level security;

drop policy if exists "profiles_owner" on profiles;
create policy "profiles_owner" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "snapshots_owner" on snapshots;
create policy "snapshots_owner" on snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budget_cards_owner" on budget_cards;
create policy "budget_cards_owner" on budget_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "distribution_log_owner" on distribution_log;
create policy "distribution_log_owner" on distribution_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals_owner" on goals;
create policy "goals_owner" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_settings_owner" on user_settings;
create policy "user_settings_owner" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "active_sessions_owner" on active_sessions;
create policy "active_sessions_owner" on active_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

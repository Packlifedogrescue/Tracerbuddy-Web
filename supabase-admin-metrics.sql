-- ─────────────────────────────────────────────
-- 1. analytics_events  (tracks feature usage)
-- ─────────────────────────────────────────────
create table if not exists analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  event       text not null,
  page        text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

create index if not exists analytics_events_event_idx      on analytics_events(event);
create index if not exists analytics_events_user_id_idx    on analytics_events(user_id);
create index if not exists analytics_events_created_at_idx on analytics_events(created_at desc);

alter table analytics_events enable row level security;

create policy if not exists "Users insert own events"
  on analytics_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "Users read own events"
  on analytics_events for select
  to authenticated
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- 2. subscription column on user_profiles
--    (skip if you already ran the RevenueCat SQL)
-- ─────────────────────────────────────────────
alter table user_profiles
  add column if not exists subscription text not null default 'free';

create index if not exists user_profiles_subscription_idx
  on user_profiles(subscription);


-- ─────────────────────────────────────────────
-- 3. error_logs  (for error rate tracking)
-- ─────────────────────────────────────────────
create table if not exists error_logs (
  id          uuid primary key default gen_random_uuid(),
  route       text,
  message     text,
  status_code int,
  user_id     uuid references auth.users(id) on delete set null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

create index if not exists error_logs_created_at_idx on error_logs(created_at desc);
create index if not exists error_logs_route_idx      on error_logs(route);

alter table error_logs enable row level security;

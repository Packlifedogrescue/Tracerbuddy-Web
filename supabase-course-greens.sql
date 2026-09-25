-- Manual green overrides for courses OpenStreetMap hasn't mapped.
-- Admins place greens on the course map ("Place greens" tool); the GPS layer then
-- draws a flag on each. Read publicly (every viewer sees them); written only by
-- the admin API using the service-role key.
create table if not exists public.course_greens_override (
  course_id  text primary key,
  greens     jsonb not null default '[]'::jsonb,   -- [{ "latitude": n, "longitude": n }, ...]
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Public read; writes bypass RLS via the service-role key in the admin API.
alter table public.course_greens_override enable row level security;

drop policy if exists "course_greens_override read" on public.course_greens_override;
create policy "course_greens_override read"
  on public.course_greens_override for select
  using (true);

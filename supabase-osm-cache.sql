-- ─────────────────────────────────────────────
-- golf_osm_cache  (OpenStreetMap GPS layer for /api/golf/raw-coordinates)
-- Caches geocode + Overpass results so we don't re-hit the rate-limited,
-- community-run OSM services on every request. Course geometry never moves,
-- so entries are kept for months (the route enforces the TTL).
-- Run this once in the Supabase SQL editor.
-- ─────────────────────────────────────────────
create table if not exists golf_osm_cache (
  course_id  text primary key,          -- "v<CACHE_VERSION>:<golfcourseapi id>"
  data       jsonb not null,
  cached_at  timestamptz not null default now()
);

create index if not exists golf_osm_cache_cached_at_idx on golf_osm_cache(cached_at desc);

-- The API route reads/writes with the anon key, so allow it (cache only — no PII).
alter table golf_osm_cache enable row level security;

do $$ begin
  create policy "anon can read osm cache"
    on golf_osm_cache for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can write osm cache"
    on golf_osm_cache for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can update osm cache"
    on golf_osm_cache for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

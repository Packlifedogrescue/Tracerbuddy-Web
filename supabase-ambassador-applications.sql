-- ─────────────────────────────────────────────
-- ambassador_applications  (Ambassador Program apply form)
-- Run this once in the Supabase SQL editor.
-- ─────────────────────────────────────────────
create table if not exists ambassador_applications (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null,
  city              text not null,
  handicap          text,
  social_handle     text,
  rounds_per_month  text,
  why               text not null,
  status            text not null default 'pending',  -- pending | approved | rejected
  created_at        timestamptz default now()
);

create index if not exists ambassador_applications_created_at_idx on ambassador_applications(created_at desc);
create index if not exists ambassador_applications_status_idx     on ambassador_applications(status);

alter table ambassador_applications enable row level security;

-- The public apply form uses the anon key to insert — allow that, nothing else.
do $$ begin
  create policy "Anyone can submit an application"
    on ambassador_applications for insert
    to anon
    with check (true);
exception when duplicate_object then null;
end $$;

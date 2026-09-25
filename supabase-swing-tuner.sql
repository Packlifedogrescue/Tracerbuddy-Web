-- Swing Tuner — video/pose swing analysis, folded into TracerBuddy.
-- Adapted from the standalone SwingTuner schema: it reuses TracerBuddy's existing
-- Supabase Auth (user_id -> auth.users) instead of SwingTuner's own profiles /
-- subscriptions tables. The iOS engine writes a `swings` row per analyzed swing
-- (plus per-frame keypoints in `swing_frames`); the web dashboard reads them.

create extension if not exists "uuid-ossp";

-- =====================
-- SWINGS
-- =====================
create table if not exists public.swings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Swing',
  club text not null default '7-Iron',
  shot_type text not null default 'drive',        -- drive, chip, putt

  -- Video
  video_url text,
  thumbnail_url text,
  video_duration_seconds double precision,
  fps integer default 240,

  -- Swing DNA score (0-100)
  dna_score integer default 0,

  -- Key metrics
  x_factor_at_top double precision default 0,
  x_factor_at_impact double precision default 0,
  tempo_ratio double precision default 0,
  backswing_duration double precision default 0,
  downswing_duration double precision default 0,
  spine_angle_address double precision default 0,
  spine_angle_impact double precision default 0,
  spine_tilt_loss double precision default 0,
  shoulder_tilt_address double precision default 0,
  shoulder_tilt_impact double precision default 0,
  hip_tilt_address double precision default 0,
  hip_tilt_impact double precision default 0,
  weight_shift_magnitude double precision default 0,
  weight_shift_direction text default 'Target',
  head_movement_range double precision default 0,
  left_knee_flex double precision default 0,
  right_knee_flex double precision default 0,
  peak_shoulder_rotation double precision default 0,
  peak_hip_rotation double precision default 0,

  -- Apple Watch data (also feeds/aligns with the existing club_sessions speeds)
  club_speed_estimate double precision default 0,
  transition_force double precision default 0,
  watch_tempo_ratio double precision default 0,

  -- AI coaching
  ai_summary text,
  ai_priority_fix text,
  ai_strengths jsonb default '[]',
  ai_faults jsonb default '[]',
  ai_drills jsonb default '[]',

  -- Metadata
  notes text,
  is_favorite boolean default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- =====================
-- SWING FRAMES (per-frame pose keypoints, for replay)
-- =====================
create table if not exists public.swing_frames (
  id uuid default uuid_generate_v4() primary key,
  swing_id uuid references public.swings(id) on delete cascade not null,
  frame_index integer not null,
  timestamp_seconds double precision not null,
  phase text not null default 'address',

  -- Keypoints (normalized 0-1)
  left_shoulder_x double precision, left_shoulder_y double precision,
  right_shoulder_x double precision, right_shoulder_y double precision,
  left_elbow_x double precision, left_elbow_y double precision,
  right_elbow_x double precision, right_elbow_y double precision,
  left_wrist_x double precision, left_wrist_y double precision,
  right_wrist_x double precision, right_wrist_y double precision,
  left_hip_x double precision, left_hip_y double precision,
  right_hip_x double precision, right_hip_y double precision,
  left_knee_x double precision, left_knee_y double precision,
  right_knee_x double precision, right_knee_y double precision,
  left_ankle_x double precision, left_ankle_y double precision,
  right_ankle_x double precision, right_ankle_y double precision,
  nose_x double precision, nose_y double precision,

  -- Frame metrics
  spine_tilt double precision,
  shoulder_tilt double precision,
  hip_tilt double precision,
  x_factor double precision,

  created_at timestamptz not null default timezone('utc', now())
);

-- =====================
-- STORAGE BUCKETS
-- =====================
insert into storage.buckets (id, name, public) values ('swing-videos', 'swing-videos', false)
  on conflict do nothing;
insert into storage.buckets (id, name, public) values ('swing-thumbnails', 'swing-thumbnails', true)
  on conflict do nothing;

-- =====================
-- ROW LEVEL SECURITY — a user only ever sees/edits their own swings
-- =====================
alter table public.swings enable row level security;
alter table public.swing_frames enable row level security;

drop policy if exists "swings: select own" on public.swings;
create policy "swings: select own" on public.swings for select using (auth.uid() = user_id);
drop policy if exists "swings: insert own" on public.swings;
create policy "swings: insert own" on public.swings for insert with check (auth.uid() = user_id);
drop policy if exists "swings: update own" on public.swings;
create policy "swings: update own" on public.swings for update using (auth.uid() = user_id);
drop policy if exists "swings: delete own" on public.swings;
create policy "swings: delete own" on public.swings for delete using (auth.uid() = user_id);

drop policy if exists "swing_frames: select own" on public.swing_frames;
create policy "swing_frames: select own" on public.swing_frames for select
  using (auth.uid() = (select user_id from public.swings where id = swing_id));
drop policy if exists "swing_frames: insert own" on public.swing_frames;
create policy "swing_frames: insert own" on public.swing_frames for insert
  with check (auth.uid() = (select user_id from public.swings where id = swing_id));

-- =====================
-- STORAGE POLICIES — videos are private per user; thumbnails are public-read
-- =====================
drop policy if exists "swing videos: upload own" on storage.objects;
create policy "swing videos: upload own" on storage.objects for insert
  with check (bucket_id = 'swing-videos' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "swing videos: view own" on storage.objects;
create policy "swing videos: view own" on storage.objects for select
  using (bucket_id = 'swing-videos' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "swing videos: delete own" on storage.objects;
create policy "swing videos: delete own" on storage.objects for delete
  using (bucket_id = 'swing-videos' and auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- INDEXES
-- =====================
create index if not exists swings_user_id_idx    on public.swings(user_id);
create index if not exists swings_created_at_idx  on public.swings(created_at desc);
create index if not exists swing_frames_swing_idx on public.swing_frames(swing_id, frame_index);

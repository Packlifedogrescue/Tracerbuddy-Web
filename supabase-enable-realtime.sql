-- ─────────────────────────────────────────────
-- Enable Supabase realtime for the dashboard live-update feature.
-- The web dashboard subscribes to these tables via lib/useRealtime.ts;
-- without adding them to the realtime publication, those subscriptions
-- receive nothing. Run this once in the Supabase SQL editor.
--
-- Each block is wrapped so it's safe to run even if a table is already
-- in the publication (and safe to re-run as you add more tables).
--
-- Note: realtime respects Row Level Security — a user only receives
-- changes they're allowed to read. Make sure each table has RLS policies.
-- ─────────────────────────────────────────────
do $$ begin alter publication supabase_realtime add table rounds;             exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table club_sessions;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table putt_data;          exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table club_profiles;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table user_bag;           exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table coach_cards;        exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table practice_sessions;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table goal_settings;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table buddy_connections;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table hole_stats;         exception when duplicate_object then null; end $$;

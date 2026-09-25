import { supabase } from './supabase'

export type TrackEvent =
  | 'page_view'
  | 'course_searched'
  | 'course_viewed'
  | 'course_map_viewed'
  | 'course_conditions_viewed'
  | 'round_viewed'
  | 'ai_coach_queried'
  | 'club_added'
  | 'club_removed'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_completed'
  | 'buddy_invited'
  | 'buddy_accepted'
  | 'practice_session_viewed'
  | 'swing_data_viewed'
  | 'putting_data_viewed'
  | 'watch_synced_viewed'
  | 'tournament_viewed'
  | 'weather_viewed'
  | 'tee_changed'

export function track(event: TrackEvent, metadata?: Record<string, any>) {
  // Fire and forget — never blocks rendering, never throws
  Promise.resolve().then(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event,
        page: typeof window !== 'undefined' ? window.location.pathname : null,
        metadata: metadata ?? {},
      })
    } catch { /* silently ignore */ }
  })
}

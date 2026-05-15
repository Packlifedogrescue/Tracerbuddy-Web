import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  'https://mmwxbpqviqtitxptfiog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1td3hicHF2aXF0aXR4cHRmaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjgwOTUsImV4cCI6MjA5NDEwNDA5NX0.tTUHcNpSaWzH6WkOm5wx4xT-W9f-qRv9_wDllbwZ2dU'
)

// Auth helpers
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Data fetchers
export async function fetchRounds(limit = 20) {
  const { data } = await supabase
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function fetchRoundWithShots(roundId: string) {
  const [round, shots, holeStats, puttData] = await Promise.all([
    supabase.from('rounds').select('*').eq('id', roundId).single(),
    supabase.from('shots').select('*').eq('round_id', roundId).order('hole'),
    supabase.from('hole_stats').select('*').eq('round_id', roundId).order('hole'),
    supabase.from('putt_data').select('*').eq('round_id', roundId).order('hole'),
  ])
  return {
    round: round.data,
    shots: shots.data || [],
    holeStats: holeStats.data || [],
    puttData: puttData.data || [],
  }
}

export async function fetchClubProfiles() {
  const { data } = await supabase
    .from('club_profiles')
    .select('*')
    .order('avg_yards', { ascending: false })
  return data || []
}

export async function fetchHandicapHistory() {
  const { data } = await supabase
    .from('handicap_history')
    .select('handicap, recorded_at')
    .order('recorded_at', { ascending: true })
    .limit(20)
  return data || []
}

export async function fetchUserProfile() {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .single()
  return data
}

export async function fetchPuttData() {
  const { data } = await supabase
    .from('putt_data')
    .select('*, rounds(course_name, created_at)')
    .order('rounds(created_at)', { ascending: false })
    .limit(100)
  return data || []
}

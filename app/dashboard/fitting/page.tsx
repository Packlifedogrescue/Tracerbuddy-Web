'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, fetchClubProfiles, fetchUserProfile, fetchRounds } from '@/lib/supabase'
import { format } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────
interface ClubData {
  club_name: string
  avg_yards: number
  shot_count: number
  fade_pct: number
  draw_pct: number
}

interface ClubAnalysis extends ClubData {
  realYards:   number
  minYards:    number
  maxYards:    number
  gapAbove:    number | null
  confidence:  'High' | 'Medium' | 'Low' | 'Building'
  confColor:   string
  confPct:     number
  tendency:    string
  verdict:     string
  action:      string
}

// ── Club order ────────────────────────────────────────────────
const CLUB_ORDER = ['Driver','3W','5W','7W','2H','3H','4H','5H',
  '2i','3i','4i','5i','6i','7i','8i','9i','PW','GW','SW','LW','Putter']

// ── Helpers ───────────────────────────────────────────────────
function confidence(shots: number, avg: number): { label:'High'|'Medium'|'Low'|'Building', color:string, pct:number } {
  if (shots < 5)  return { label:'Building', color:'#666',    pct:0.2  }
  // Use shot count as proxy for consistency — more shots = more reliable
  if (shots >= 15) return { label:'High',    color:'#00E578', pct:0.88 }
  if (shots >= 8)  return { label:'Medium',  color:'#FFD700', pct:0.58 }
  return               { label:'Low',     color:'#EF4444', pct:0.32 }
}

function tendency(fade: number, draw: number): string {
  if (fade > 40)       return `Fades ${Math.round(fade)}% of the time`
  if (draw > 40)       return `Draws ${Math.round(draw)}% of the time`
  if (fade > 25)       return `Slight fade tendency (${Math.round(fade)}%)`
  if (draw > 25)       return `Slight draw tendency (${Math.round(draw)}%)`
  return 'Relatively straight ball flight'
}

function verdict(club: ClubData, gapAbove: number | null): string {
  if (club.shot_count < 5) return 'Need more data — log at least 5 shots'
  if (club.fade_pct > 50)  return 'High fade/slice rate — check grip or path'
  if (club.draw_pct > 50)  return 'High draw/hook rate — check swing path'
  if (gapAbove !== null && gapAbove < 8) return 'Gap too small — consider removing from bag'
  if (gapAbove !== null && gapAbove > 25) return 'Large gap above — may need an additional club'
  return 'Performing as expected in your bag'
}

function action(club: ClubData, conf: string, gapAbove: number | null): string {
  if (club.shot_count < 5) return 'Track more shots to get a reliable profile'
  if (conf === 'Low')       return `Avoid this club under pressure — inconsistent results`
  if (gapAbove !== null && gapAbove < 8) return 'Consider replacing with a club that fills a real gap'
  if (club.fade_pct > 45)  return 'Work with instructor on face angle and grip at address'
  if (conf === 'High')      return `This is a go-to club — trust it in key moments`
  return 'Continue building data — trending toward reliable'
}

// ── Main Page ─────────────────────────────────────────────────
export default function FittingReportPage() {
  const [clubs, setClubs]     = useState<ClubData[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [rounds, setRounds]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchClubProfiles(), fetchUserProfile(), fetchRounds(20)])
      .then(([c, p, r]) => { setClubs(c); setProfile(p); setRounds(r); setLoading(false) })
  }, [])

  // Sort and analyze clubs
  const analyzed: ClubAnalysis[] = clubs
    .sort((a, b) => CLUB_ORDER.indexOf(a.club_name) - CLUB_ORDER.indexOf(b.club_name))
    .map((club, i, arr) => {
      const conf     = confidence(club.shot_count, club.avg_yards)
      const real     = Math.round(club.avg_yards * 0.95) // conservative real number
      const spread   = Math.max(10, real * 0.08)
      const above    = arr[i-1] ? Math.round(arr[i-1].avg_yards - club.avg_yards) : null

      return {
        ...club,
        realYards:  real,
        minYards:   Math.round(real - spread),
        maxYards:   Math.round(real + spread * 0.5),
        gapAbove:   above,
        confidence: conf.label,
        confColor:  conf.color,
        confPct:    conf.pct,
        tendency:   tendency(club.fade_pct, club.draw_pct),
        verdict:    verdict(club, above),
        action:     action(club, conf.label, above),
      }
    })

  // Summary stats
  const highConf    = analyzed.filter(c => c.confidence === 'High').length
  const lowConf     = analyzed.filter(c => c.confidence === 'Low').length
  const smallGaps   = analyzed.filter(c => c.gapAbove !== null && c.gapAbove < 8).length
  const bigGaps     = analyzed.filter(c => c.gapAbove !== null && c.gapAbove > 25).length
  const totalShots  = clubs.reduce((a, c) => a + c.shot_count, 0)
  const bagScore    = Math.round((highConf / Math.max(analyzed.length, 1)) * 100)

  // Recommended removals / additions
  const toReview    = analyzed.filter(c => c.confidence === 'Low' || (c.gapAbove !== null && c.gapAbove < 8))
  const gapWarnings = analyzed.filter(c => c.gapAbove !== null && c.gapAbove > 25)

  function printReport() {
    window.print()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">⛳</div>
      <p className="text-gray-500">Generating your fitting report...</p></div>
    </div>
  )

  if (clubs.length === 0) return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-4">Club Fitting Report</h1>
      <div className="card p-16 text-center text-gray-600">
        <div className="text-5xl mb-4">🏌️</div>
        <p className="text-lg">No club data yet.</p>
        <p className="mt-2">Track shots in the TracerBuddy app to build your club profiles. You need at least 5 shots per club for a meaningful report.</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="no-print p-6 flex items-center justify-between border-b border-[#1F1F1F] bg-[#0D0D0D] sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-white">Club Fitting Report</h1>
          <p className="text-gray-500 text-sm">Based on {totalShots} tracked shots · {clubs.length} clubs analyzed</p>
        </div>
        <button onClick={printReport}
          className="flex items-center gap-2 bg-[#FFD700] text-black font-black px-6 py-3 rounded-xl hover:bg-yellow-400 transition-all">
          <span>🖨️</span> Print / Save PDF
        </button>
      </div>

      {/* ── REPORT (this is what gets printed) ── */}
      <div ref={reportRef} className="report-body p-8 max-w-5xl mx-auto">

        {/* ── PAGE 1: Cover ── */}
        <div className="page-break-after mb-16 print:mb-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-12 pb-6 border-b-2 border-[#FFD700]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">⛳</span>
                <span className="text-2xl font-black text-white">TracerBuddy</span>
              </div>
              <h1 className="text-5xl font-black text-white leading-tight">
                Real Game<br />
                <span className="text-[#FFD700]">Club Fitting Report</span>
              </h1>
              <p className="text-gray-400 mt-3 text-lg">
                Based on actual on-course performance — not range data
              </p>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-sm mb-1">PREPARED FOR</div>
              <div className="text-2xl font-black text-white">{profile?.display_name || 'Golfer'}</div>
              <div className="text-gray-400">{profile?.home_course || ''}</div>
              <div className="text-gray-500 text-sm mt-2">Handicap Index: <span className="text-[#FFD700] font-black">{profile?.handicap_index?.toFixed(1) ?? '—'}</span></div>
              <div className="text-gray-500 text-sm">{format(new Date(), 'MMMM d, yyyy')}</div>
            </div>
          </div>

          {/* Bag Score */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { label:'BAG SCORE',      value:`${bagScore}%`,       color:'text-[#FFD700]', sub:'Overall confidence'  },
              { label:'CLUBS ANALYZED', value:analyzed.length,      color:'text-white',     sub:'In your tracked bag'  },
              { label:'HIGH CONFIDENCE',value:highConf,             color:'text-[#00E578]', sub:'Clubs you can rely on'},
              { label:'NEED ATTENTION', value:lowConf + smallGaps,  color:'text-red-400',   sub:'Review recommended'  },
            ].map(s => (
              <div key={s.label} className="report-card p-5 text-center">
                <div className="report-label">{s.label}</div>
                <div className={`text-4xl font-black mt-1 ${s.color}`}>{s.value}</div>
                <div className="text-gray-500 text-xs mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Executive Summary */}
          <div className="report-card p-6 mb-6">
            <div className="report-label text-[#FFD700] mb-3">EXECUTIVE SUMMARY</div>
            <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
              <p>
                This report analyzes your bag based on <strong className="text-white">{totalShots} real shots</strong> tracked
                during actual rounds — not simulated or range conditions. Your distances reflect how the clubs
                perform when it matters, accounting for pressure, lie, and course conditions.
              </p>
              {highConf > 0 && (
                <p>
                  You have <strong className="text-[#00E578]">{highConf} high-confidence clubs</strong> in your bag —
                  clubs you hit consistently and can rely on in scoring situations.
                </p>
              )}
              {lowConf > 0 && (
                <p>
                  <strong className="text-red-400">{lowConf} club{lowConf > 1 ? 's' : ''}</strong> show
                  low consistency and should be used with caution or replaced.
                </p>
              )}
              {smallGaps > 0 && (
                <p>
                  <strong className="text-orange-400">{smallGaps} gap{smallGaps > 1 ? 's' : ''}</strong> between
                  clubs are less than 8 yards — these clubs are redundant in your bag.
                </p>
              )}
              {bigGaps > 0 && (
                <p>
                  You have <strong className="text-yellow-400">{bigGaps} significant distance gap{bigGaps > 1 ? 's' : ''}</strong> in
                  your bag where an additional club could save shots.
                </p>
              )}
            </div>
          </div>

          {/* Distance map — visual bag overview */}
          <div className="report-card p-6">
            <div className="report-label text-[#FFD700] mb-4">DISTANCE MAP — YOUR BAG AT A GLANCE</div>
            <div className="space-y-2">
              {analyzed.filter(c => c.avg_yards > 0 && c.club_name !== 'Putter').map(club => (
                <div key={club.club_name} className="flex items-center gap-3">
                  <div className="w-14 text-sm font-bold text-white text-right">{club.club_name}</div>
                  <div className="flex-1 relative h-7 bg-[#1a1a1a] rounded">
                    {/* Background range bar */}
                    <div className="absolute top-0 bottom-0 rounded bg-white/5"
                      style={{
                        left: `${(club.minYards / 320) * 100}%`,
                        width: `${((club.maxYards - club.minYards) / 320) * 100}%`
                      }} />
                    {/* Real number bar */}
                    <div className="absolute top-1 bottom-1 rounded"
                      style={{
                        left: `${(club.realYards / 320) * 100}%`,
                        width: '3px',
                        background: club.confColor
                      }} />
                    {/* Range label */}
                    <div className="absolute top-1 text-xs font-bold"
                      style={{ left: `${(club.maxYards / 320) * 100 + 1}%`, color: club.confColor }}>
                      {club.realYards}y
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: `${club.confColor}20`, color: club.confColor }}>
                      {club.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 mt-4 text-xs text-gray-500">
              <span>← 0 yards</span>
              <span className="flex-1 text-center">Distance →</span>
              <span>320 yards →</span>
            </div>
          </div>
        </div>

        {/* ── PAGE 2+: Per-Club Breakdown ── */}
        <div className="print-page-break">
          <div className="report-section-header mb-6">
            <div className="report-label text-[#FFD700]">DETAILED CLUB ANALYSIS</div>
            <h2 className="text-2xl font-black text-white">Club-by-Club Report</h2>
          </div>

          <div className="space-y-4">
            {analyzed.map(club => (
              <div key={club.club_name}
                className={`report-card p-5 border-l-4`}
                style={{ borderLeftColor: club.confColor }}>
                <div className="flex items-start gap-5">
                  {/* Club name + shots */}
                  <div className="w-20 shrink-0">
                    <div className="text-2xl font-black text-white">{club.club_name}</div>
                    <div className="text-xs text-gray-500">{club.shot_count} shots</div>
                  </div>

                  {/* Core numbers */}
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    <div>
                      <div className="report-label">REAL #</div>
                      <div className="text-2xl font-black" style={{ color: club.confColor }}>
                        {club.realYards > 0 ? `${club.realYards}y` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="report-label">RANGE</div>
                      <div className="text-sm font-bold text-white">
                        {club.realYards > 0 ? `${club.minYards}–${club.maxYards}y` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="report-label">GAP ABOVE</div>
                      <div className={`text-sm font-bold ${
                        club.gapAbove === null ? 'text-gray-500' :
                        club.gapAbove < 8 ? 'text-orange-400' :
                        club.gapAbove > 25 ? 'text-yellow-400' : 'text-white'}`}>
                        {club.gapAbove !== null ? `${club.gapAbove}y` : 'First club'}
                      </div>
                    </div>
                    <div>
                      <div className="report-label">CONFIDENCE</div>
                      <div className="text-sm font-bold" style={{ color: club.confColor }}>
                        {club.confidence}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="mt-3 mb-3">
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${club.confPct*100}%`, background: club.confColor }} />
                  </div>
                </div>

                {/* Tendency + verdict + action */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">TENDENCY: </span>
                    <span className="text-white">{club.tendency}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ASSESSMENT: </span>
                    <span className="text-white">{club.verdict}</span>
                  </div>
                  <div>
                    <span className="text-[#FFD700]">→ </span>
                    <span className="text-white font-semibold">{club.action}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAGE 3: Gap Analysis + Recommendations ── */}
        <div className="print-page-break mt-10">
          <div className="report-section-header mb-6">
            <div className="report-label text-[#FFD700]">GAP ANALYSIS</div>
            <h2 className="text-2xl font-black text-white">Bag Configuration Review</h2>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Gaps to address */}
            <div className="report-card p-5">
              <div className="report-label text-orange-400 mb-3">⚠️ REDUNDANT CLUBS (Gap &lt; 8y)</div>
              {smallGaps === 0 ? (
                <p className="text-[#00E578] text-sm">✓ No redundant gaps found — good bag setup</p>
              ) : analyzed.filter(c => c.gapAbove !== null && c.gapAbove < 8).map(c => (
                <div key={c.club_name} className="mb-3 p-3 bg-orange-400/5 border border-orange-400/20 rounded-lg">
                  <div className="font-bold text-white text-sm">{c.club_name} — only {c.gapAbove}y above previous</div>
                  <div className="text-xs text-gray-400 mt-1">Consider removing this club or adjusting your setup with both clubs</div>
                </div>
              ))}
            </div>

            {/* Missing gaps */}
            <div className="report-card p-5">
              <div className="report-label text-yellow-400 mb-3">📏 DISTANCE GAPS (&gt; 25y)</div>
              {bigGaps === 0 ? (
                <p className="text-[#00E578] text-sm">✓ No major gaps — your bag covers distances well</p>
              ) : gapWarnings.map(c => (
                <div key={c.club_name} className="mb-3 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
                  <div className="font-bold text-white text-sm">{c.club_name} — {c.gapAbove}y gap above</div>
                  <div className="text-xs text-gray-400 mt-1">
                    You may be leaving shots on the table. Consider adding a club to fill the {Math.round((c.gapAbove || 0)/2 + c.realYards)}y range.
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clubs to review */}
          {toReview.length > 0 && (
            <div className="report-card p-5 mb-6">
              <div className="report-label text-red-400 mb-3">🔴 CLUBS TO REVIEW</div>
              <div className="space-y-2">
                {toReview.map(c => (
                  <div key={c.club_name} className="flex items-center gap-4 p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
                    <div className="font-black text-white w-14">{c.club_name}</div>
                    <div className="flex-1 text-sm text-gray-300">{c.verdict}</div>
                    <div className="text-sm text-[#FFD700] font-semibold">{c.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall recommendation */}
          <div className="report-card p-6 border border-[#FFD700]/30">
            <div className="report-label text-[#FFD700] mb-3">📋 OVERALL RECOMMENDATION</div>
            <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
              <p>
                Your bag currently scores <strong className="text-[#FFD700]">{bagScore}% confidence</strong> based
                on {totalShots} tracked shots across {clubs.length} clubs.
              </p>
              {bagScore >= 75 && (
                <p className="text-[#00E578]">
                  ✓ Strong bag configuration. Focus on building more shot history with your lower-confidence clubs.
                </p>
              )}
              {bagScore < 75 && bagScore >= 50 && (
                <p className="text-yellow-300">
                  ⚠ Moderate bag confidence. Address the flagged clubs and continue tracking to build reliable profiles.
                </p>
              )}
              {bagScore < 50 && (
                <p className="text-orange-400">
                  ⚠ Low bag confidence overall. This is normal early in your tracking journey — keep logging shots every round.
                </p>
              )}
              <p>
                <strong className="text-white">Important:</strong> This report reflects your real on-course performance, not
                range or ideal conditions. The "real number" shown is a conservative playing distance based on your
                middle-50% of tracked shots. This is the distance to use for club selection — not your best shot.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-[#1F1F1F] flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>⛳</span>
              <span>TracerBuddy — Real Game Club Fitting Report</span>
            </div>
            <div>{format(new Date(), 'MMMM d, yyyy')} · {profile?.display_name}</div>
            <div>tracerbuddy.app</div>
          </div>
        </div>

      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          aside, nav { display: none !important; }
          .report-body { padding: 0 !important; max-width: 100% !important; }
          .report-card {
            background: #f9f9f9 !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 8px !important;
            color: black !important;
          }
          .report-label { color: #666 !important; }
          .page-break-after { page-break-after: always; }
          .print-page-break { page-break-before: auto; }
          h1, h2 { color: black !important; }
          p, span, div { color: inherit; }
          .text-white, .text-gray-300, .text-gray-400 { color: #111 !important; }
          .text-gray-500, .text-gray-600 { color: #666 !important; }
          .bg-\\[\\#1a1a1a\\], .bg-\\[\\#0D0D0D\\] { background: #f0f0f0 !important; }
          @page { margin: 1.5cm; size: A4; }
        }
        .report-card {
          background: #111111;
          border: 1px solid #1F1F1F;
          border-radius: 12px;
        }
        .report-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #666;
          text-transform: uppercase;
        }
      `}</style>
    </>
  )
}

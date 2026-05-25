import { NextRequest, NextResponse } from 'next/server'

// PGA Tour strokes-to-hole-out baselines (industry standard public data)
// Source: Mark Broadie "Every Shot Counts" research
const PUTTING_BASELINES: Record<number, number> = {
  1: 1.0, 2: 1.003, 3: 1.022, 4: 1.057, 5: 1.083, 6: 1.108, 7: 1.134,
  8: 1.158, 9: 1.183, 10: 1.208, 12: 1.255, 14: 1.297, 16: 1.335,
  18: 1.370, 20: 1.402, 25: 1.471, 30: 1.530, 40: 1.625, 50: 1.695,
  60: 1.750, 75: 1.810, 100: 1.900,
}

// Approach shot baselines by distance (yards) from fairway
const APPROACH_FAIRWAY: Record<number, number> = {
  50: 2.60, 75: 2.72, 100: 2.83, 125: 2.96, 150: 3.10, 175: 3.24,
  200: 3.38, 225: 3.52, 250: 3.65,
}

const APPROACH_ROUGH: Record<number, number> = {
  50: 2.72, 75: 2.86, 100: 2.99, 125: 3.14, 150: 3.29, 175: 3.45,
  200: 3.60, 225: 3.75, 250: 3.90,
}

const APPROACH_SAND: Record<number, number> = {
  10: 2.40, 20: 2.52, 30: 2.65, 40: 2.80, 50: 2.98, 75: 3.20, 100: 3.45,
}

// Tee shot baselines by hole distance
const TEE_SHOT: Record<number, number> = {
  100: 2.60, 125: 2.72, 150: 2.85, 175: 2.98, 200: 3.11, 225: 3.24,
  250: 3.37, 275: 3.50, 300: 3.63, 325: 3.75, 350: 3.87, 375: 3.98,
  400: 4.08, 425: 4.17, 450: 4.25, 475: 4.32, 500: 4.38, 525: 4.43, 550: 4.48,
}

function interpolate(table: Record<number, number>, distance: number): number {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
  if (distance <= keys[0]) return table[keys[0]]
  if (distance >= keys[keys.length - 1]) return table[keys[keys.length - 1]]
  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i], hi = keys[i + 1]
    if (distance >= lo && distance <= hi) {
      const t = (distance - lo) / (hi - lo)
      return table[lo] + t * (table[hi] - table[lo])
    }
  }
  return 3.5
}

function baselineStrokes(distance: number, lie: string): number {
  switch (lie) {
    case 'tee':     return interpolate(TEE_SHOT, distance)
    case 'fairway': return interpolate(APPROACH_FAIRWAY, distance)
    case 'rough':   return interpolate(APPROACH_ROUGH, distance)
    case 'sand':    return interpolate(APPROACH_SAND, distance)
    case 'green':   return interpolate(PUTTING_BASELINES, distance)
    default:        return interpolate(APPROACH_ROUGH, distance)
  }
}

interface Shot {
  distance: number   // yards to hole
  lie: string        // 'tee' | 'fairway' | 'rough' | 'sand' | 'green' | 'penalty'
  distanceAfter?: number  // yards to hole after shot (null if holed)
  lieAfter?: string
}

export async function POST(req: NextRequest) {
  try {
    const { shots }: { shots: Shot[] } = await req.json()

    if (!shots?.length) {
      return NextResponse.json({ error: 'shots array required' }, { status: 400 })
    }

    let totalSG = 0
    const breakdown: any[] = []

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]
      const before = baselineStrokes(shot.distance, shot.lie)

      let after: number
      if (shot.distanceAfter == null || shot.distanceAfter === 0) {
        // Holed out
        after = 0
      } else {
        after = baselineStrokes(shot.distanceAfter, shot.lieAfter ?? 'fairway')
      }

      // SG = baseline_before - (1 + baseline_after)
      const sg = before - (1 + after)
      totalSG += sg

      breakdown.push({
        shotNumber:   i + 1,
        distance:     shot.distance,
        lie:          shot.lie,
        baseline:     parseFloat(before.toFixed(3)),
        sg:           parseFloat(sg.toFixed(3)),
        category:     shot.lie === 'green' ? 'putting'
                    : shot.lie === 'tee'   ? 'off_tee'
                    : ['sand'].includes(shot.lie) ? 'around_green'
                    : shot.distance > 100  ? 'approach'
                    : 'around_green',
      })
    }

    // Aggregate by category
    const byCategory: Record<string, number> = {}
    for (const s of breakdown) {
      byCategory[s.category] = (byCategory[s.category] ?? 0) + s.sg
    }

    return NextResponse.json({
      totalSG:    parseFloat(totalSG.toFixed(3)),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, parseFloat((v as number).toFixed(3))])
      ),
      breakdown,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

// Strokes Gained lookup tables — expected strokes to hole from distance/lie
// Based on Mark Broadie's SG research (adapted for amateur baselines)
const SG_TABLE: Record<string, [number, number][]> = {
  fairway: [
    [500, 4.70], [450, 4.50], [400, 4.30], [350, 4.10], [300, 3.90],
    [250, 3.70], [200, 3.50], [150, 3.20], [125, 3.05], [100, 2.90],
    [75,  2.70], [50,  2.50], [30,  2.30], [20,  2.15], [10,  2.05],
  ],
  tee: [
    [500, 4.70], [450, 4.50], [400, 4.30], [350, 4.10], [300, 3.90],
    [250, 3.70], [200, 3.50], [150, 3.20], [125, 3.05], [100, 2.90],
    [75,  2.70], [50,  2.50], [30,  2.30], [20,  2.15], [10,  2.05],
  ],
  rough: [
    [500, 4.85], [450, 4.65], [400, 4.45], [350, 4.25], [300, 4.05],
    [250, 3.85], [200, 3.60], [150, 3.35], [125, 3.20], [100, 3.05],
    [75,  2.85], [50,  2.65], [30,  2.45], [20,  2.30], [10,  2.15],
  ],
  sand: [
    [200, 3.80], [150, 3.55], [100, 3.25], [75, 3.05], [50, 2.85],
    [30,  2.65], [20,  2.50], [10,  2.35],
  ],
  recovery: [
    [200, 4.10], [150, 3.80], [100, 3.50], [75, 3.25], [50, 3.00],
    [30,  2.80], [20,  2.60], [10,  2.40],
  ],
  green: [
    [100, 2.40], [60, 2.35], [50, 2.30], [40, 2.22], [30, 2.12],
    [20,  2.00], [15, 1.90], [10, 1.78], [7,  1.65], [5,  1.52],
    [3,   1.35], [2,  1.20], [1,  1.08],
  ],
}

function expectedStrokes(lie: string, distanceYards: number): number {
  if (distanceYards <= 0) return 0
  const table = SG_TABLE[lie] ?? SG_TABLE.fairway
  if (distanceYards >= table[0][0]) return table[0][1]
  if (distanceYards <= table[table.length - 1][0]) return table[table.length - 1][1]
  for (let i = 0; i < table.length - 1; i++) {
    const [d1, s1] = table[i]
    const [d2, s2] = table[i + 1]
    if (distanceYards <= d1 && distanceYards >= d2) {
      const t = (distanceYards - d2) / (d1 - d2)
      return s2 + t * (s1 - s2)
    }
  }
  return table[table.length - 1][1]
}

function categorizeShotByLieAndDistance(lie: string, distanceYards: number): string {
  if (lie === 'tee')   return 'off_tee'
  if (lie === 'green') return 'putting'
  if (distanceYards <= 30) return 'around_green'
  return 'approach'
}

interface Shot {
  distance: number
  lie: string
  distanceAfter?: number
  lieAfter?: string
}

export async function POST(req: NextRequest) {
  try {
    const { shots }: { shots: Shot[] } = await req.json()

    if (!Array.isArray(shots) || shots.length === 0) {
      return NextResponse.json({ error: 'shots array required' }, { status: 400 })
    }

    const byCategory: Record<string, number> = {
      off_tee: 0,
      approach: 0,
      around_green: 0,
      putting: 0,
    }

    for (const shot of shots) {
      const { distance, lie, distanceAfter, lieAfter } = shot
      if (distance == null || lie == null) continue

      const startExp = expectedStrokes(lie, distance)
      const endExp   = expectedStrokes(lieAfter ?? 'green', distanceAfter ?? 0)
      const sg       = startExp - endExp - 1

      const category = categorizeShotByLieAndDistance(lie, distance)
      byCategory[category] = (byCategory[category] ?? 0) + sg
    }

    for (const k of Object.keys(byCategory)) {
      byCategory[k] = Math.round(byCategory[k] * 100) / 100
    }

    return NextResponse.json({ byCategory })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

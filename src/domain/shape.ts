import type { BendId, Bends, ShapeParams, UH } from './types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))

export const DEFAULT_BENDS: Bends = {
  toeRound: 0,
  toeUnder: 0,
  vamp: 6,
  lacing: 0,
  collarFront: 0,
  collarBack: 0,
  heel: 0,
  midsoleArch: 0,
  heelRocker: 0,
}

/** Allowed range for each bend, in px. */
export const BEND_LIMITS: Record<BendId, [number, number]> = {
  toeRound: [-30, 40],
  toeUnder: [-20, 30],
  vamp: [-30, 50],
  lacing: [-25, 25],
  collarFront: [-50, 50],
  collarBack: [-50, 50],
  heel: [-20, 40],
  midsoleArch: [-25, 25],
  heelRocker: [0, 30],
}

export const BEND_LABELS: Record<BendId, string> = {
  toeRound: 'Toe roundness',
  toeUnder: 'Toe underside curve',
  vamp: 'Vamp curve',
  lacing: 'Lacing curve',
  collarFront: 'Collar curve (front)',
  collarBack: 'Collar curve (back)',
  heel: 'Heel curve',
  midsoleArch: 'Midsole arch',
  heelRocker: 'Heel rocker (sole)',
}

export const DEFAULT_SHAPE: ShapeParams = {
  length: 700,
  toeHeight: 84,
  toeTopU: 0.14,
  toeSpring: 14,
  toeCap: 0.21,
  midsoleToe: 34,
  midsoleHeel: 64,
  outsole: 14,
  heelBulge: 0.012,
  heelCounter: 0.8,
  tongueHeight: 28,
  eyelets: 5,
  throat: { u: 0.36, h: 140 },
  collarFront: { u: 0.575, h: 186 },
  collarDip: { u: 0.73, h: 142 },
  heelTop: { u: 0.965, h: 152 },
  bends: DEFAULT_BENDS,
  toeNose: { u: -0.008, f: 0.3 },
  soleToe: { u: -0.012, f: 0.5 },
  soleToeBlunt: 0.3,
  collarWidth: 26,
}

/** Ranges for the toe-end parameters. */
export const TOE_LIMITS = {
  noseU: [-0.05, 0.04],
  noseF: [0.05, 0.75],
  soleU: [-0.04, 0.01],
  soleF: [0, 1],
} as const

export interface ToeStyle {
  name: string
  apply: (s: ShapeParams) => ShapeParams
}

const toeStyle = (
  name: string,
  nose: [number, number],
  sole: [number, number],
  blunt: number,
  toeRound: number,
  toeUnder: number,
): ToeStyle => ({
  name,
  apply: (s) =>
    clampShape({
      ...s,
      toeNose: { u: nose[0], f: nose[1] },
      soleToe: { u: sole[0], f: sole[1] },
      soleToeBlunt: blunt,
      bends: { ...s.bends, toeRound, toeUnder },
    }),
})

/** One-click toe shapes; they only change the toe end and keep the rest of the shoe. */
export const TOE_STYLES: ToeStyle[] = [
  toeStyle('Round', [-0.008, 0.3], [-0.012, 0.5], 0.3, 0, 0),
  toeStyle('Pointed', [-0.042, 0.2], [-0.036, 0.42], 0, -12, -6),
  toeStyle('Square', [0.004, 0.56], [-0.004, 0.62], 1, 6, 8),
  toeStyle('Almond', [-0.024, 0.36], [-0.022, 0.5], 0.15, 6, -2),
  toeStyle('Bumper', [-0.012, 0.22], [-0.024, 0.9], 0.6, 14, 8),
  toeStyle('Chisel', [-0.032, 0.12], [-0.03, 0.28], 0, -20, 0),
]

export interface ShapePreset {
  name: string
  emoji: string
  shape: ShapeParams
}

const preset = (name: string, emoji: string, patch: Partial<ShapeParams>): ShapePreset => ({
  name,
  emoji,
  shape: clampShape({ ...DEFAULT_SHAPE, ...patch }),
})

export const SHAPE_PRESETS: ShapePreset[] = [
  preset('Runner', '🏃', {}),
  preset('Court Low', '🎾', {
    toeSpring: 6, midsoleToe: 30, midsoleHeel: 34, outsole: 10, toeHeight: 78, toeTopU: 0.12,
    throat: { u: 0.37, h: 128 }, collarFront: { u: 0.58, h: 168 }, collarDip: { u: 0.74, h: 128 }, heelTop: { u: 0.97, h: 138 },
    heelBulge: 0.006,
  }),
  preset('Mid-Top', '⛹️', {
    eyelets: 7, throat: { u: 0.35, h: 140 }, collarFront: { u: 0.6, h: 238 }, collarDip: { u: 0.76, h: 214 }, heelTop: { u: 0.96, h: 226 },
    midsoleToe: 30, midsoleHeel: 44, toeSpring: 10,
  }),
  preset('High-Top', '🏀', {
    eyelets: 9, tongueHeight: 34, throat: { u: 0.34, h: 140 }, collarFront: { u: 0.62, h: 300 }, collarDip: { u: 0.78, h: 276 },
    heelTop: { u: 0.955, h: 292 }, midsoleToe: 32, midsoleHeel: 46, toeSpring: 10, heelCounter: 0.76,
  }),
  preset('Chunky', '🦖', {
    midsoleToe: 64, midsoleHeel: 104, outsole: 22, toeHeight: 84, toeSpring: 20, length: 740, heelBulge: 0.02,
    throat: { u: 0.36, h: 132 }, collarFront: { u: 0.57, h: 176 }, collarDip: { u: 0.72, h: 136 }, heelTop: { u: 0.965, h: 148 },
    bends: { ...DEFAULT_BENDS, toeRound: 14, vamp: 14, midsoleArch: -10, heelRocker: 10, heel: 10 },
  }),
  preset('Racer', '⚡', {
    length: 760, toeHeight: 54, toeTopU: 0.09, toeSpring: 30, midsoleToe: 26, midsoleHeel: 70, outsole: 8, heelBulge: 0.004,
    throat: { u: 0.37, h: 118 }, collarFront: { u: 0.58, h: 160 }, collarDip: { u: 0.74, h: 112 }, heelTop: { u: 0.97, h: 128 },
    tongueHeight: 18, eyelets: 6,
    bends: { ...DEFAULT_BENDS, toeRound: -8, vamp: -4, collarFront: -14, heelRocker: 14 },
  }),
]

/** Keeps every parameter in a range where the generated outline stays a valid, non-self-intersecting shoe. */
export function clampShape(s: ShapeParams): ShapeParams {
  const out: ShapeParams = {
    ...s,
    length: clamp(s.length, 560, 800),
    toeTopU: clamp(s.toeTopU, 0.05, 0.2),
    toeSpring: clamp(s.toeSpring, 0, 40),
    toeCap: clamp(s.toeCap, 0.12, 0.32),
    midsoleToe: clamp(s.midsoleToe, 12, 90),
    midsoleHeel: clamp(s.midsoleHeel, 16, 130),
    outsole: clamp(s.outsole, 4, 30),
    heelBulge: 0,
    heelCounter: clamp(s.heelCounter, 0.6, 0.9),
    tongueHeight: clamp(s.tongueHeight, 0, 60),
    eyelets: Math.round(clamp(s.eyelets, 3, 10)),
  }
  // The heel must stay inside the 860px canvas: the shoe is centred, so its back edge is 430 + L·(0.5 + bulge).
  out.heelBulge = clamp(s.heelBulge, 0, Math.min(0.05, 410 / out.length - 0.5))
  // Total shoe height must stay inside the canvas.
  // Leaves room for the heel tab and tongue above the outline, and for sole curves below it.
  const soleExtra = Math.max(0, s.bends?.midsoleArch ?? 0) + Math.max(0, s.bends?.heelRocker ?? 0)
  const maxH = 362 - (out.outsole + out.midsoleHeel + soleExtra)
  out.toeHeight = clamp(s.toeHeight, 36, 130)
  const throatU = clamp(s.throat.u, out.toeTopU + 0.12, 0.5)
  out.throat = { u: throatU, h: clamp(s.throat.h, out.toeHeight * 0.8, maxH) }
  const cfU = clamp(s.collarFront.u, out.throat.u + 0.1, 0.7)
  out.collarFront = { u: cfU, h: clamp(s.collarFront.h, out.throat.h + 10, maxH) }
  const dipU = clamp(s.collarDip.u, out.collarFront.u + 0.06, 0.88)
  out.collarDip = { u: dipU, h: clamp(s.collarDip.h, 50, maxH) }
  const htU = clamp(s.heelTop.u, Math.max(0.88, out.collarDip.u + 0.06), 0.99)
  out.heelTop = { u: htU, h: clamp(s.heelTop.h, 60, maxH) }
  out.heelCounter = clamp(out.heelCounter, 0.6, Math.min(0.9, out.heelTop.u - 0.08))
  const bends = { ...DEFAULT_BENDS, ...s.bends }
  const b = Object.fromEntries(
    (Object.keys(BEND_LIMITS) as BendId[]).map((k) => [k, clamp(bends[k], ...BEND_LIMITS[k])]),
  ) as unknown as Bends

  // Keep bent curves on the canvas (outward) and from folding into the sole (inward).
  // Each curve's midpoint sits roughly at the average height of its two end anchors.
  const sole = out.outsole + out.midsoleHeel + Math.abs(b.midsoleArch) + b.heelRocker
  const fit = (k: BendId, hA: number, hB: number) => {
    const avg = (hA + hB) / 2
    b[k] = clamp(b[k], Math.max(BEND_LIMITS[k][0], -(avg - 24)), Math.min(BEND_LIMITS[k][1], Math.max(0, 392 - sole - avg)))
  }
  const nose = s.toeNose ?? DEFAULT_SHAPE.toeNose
  const soleToe = s.soleToe ?? DEFAULT_SHAPE.soleToe
  out.toeNose = { u: clamp(nose.u, ...TOE_LIMITS.noseU), f: clamp(nose.f, ...TOE_LIMITS.noseF) }
  out.soleToe = { u: clamp(soleToe.u, ...TOE_LIMITS.soleU), f: clamp(soleToe.f, ...TOE_LIMITS.soleF) }
  out.soleToeBlunt = clamp(s.soleToeBlunt ?? DEFAULT_SHAPE.soleToeBlunt, 0, 1)
  out.collarWidth = clamp(s.collarWidth ?? DEFAULT_SHAPE.collarWidth, 8, 60)
  fit('vamp', out.toeHeight, out.throat.h)
  fit('lacing', out.throat.h, out.collarFront.h)
  fit('collarFront', out.collarFront.h, out.collarDip.h)
  fit('collarBack', out.collarDip.h, out.heelTop.h)
  b.toeRound = clamp(b.toeRound, Math.max(BEND_LIMITS.toeRound[0], -out.toeHeight * 0.4), BEND_LIMITS.toeRound[1])
  out.bends = b
  return out
}

export function parseShape(raw: unknown): ShapeParams {
  const base = structuredClone(DEFAULT_SHAPE)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const num = (k: keyof ShapeParams) => (typeof r[k] === 'number' ? (r[k] as number) : (base[k] as number))
  const pt = (k: 'throat' | 'collarFront' | 'collarDip' | 'heelTop'): UH => {
    const p = r[k] as Partial<UH> | undefined
    return p && typeof p.u === 'number' && typeof p.h === 'number' ? { u: p.u, h: p.h } : base[k]
  }
  return clampShape({
    length: num('length'),
    toeHeight: num('toeHeight'),
    toeTopU: num('toeTopU'),
    toeSpring: num('toeSpring'),
    toeCap: num('toeCap'),
    midsoleToe: num('midsoleToe'),
    midsoleHeel: num('midsoleHeel'),
    outsole: num('outsole'),
    heelBulge: num('heelBulge'),
    heelCounter: num('heelCounter'),
    tongueHeight: num('tongueHeight'),
    eyelets: num('eyelets'),
    throat: pt('throat'),
    collarFront: pt('collarFront'),
    collarDip: pt('collarDip'),
    heelTop: pt('heelTop'),
    bends: Object.fromEntries(
      (Object.keys(DEFAULT_BENDS) as BendId[]).map((k) => {
        const v = (r.bends as Record<string, unknown> | undefined)?.[k]
        return [k, typeof v === 'number' ? v : DEFAULT_BENDS[k]]
      }),
    ) as unknown as Bends,
    toeNose: uf(r.toeNose, base.toeNose),
    soleToe: uf(r.soleToe, base.soleToe),
    soleToeBlunt: num('soleToeBlunt'),
    collarWidth: num('collarWidth'),
  })
}

function uf(raw: unknown, fallback: { u: number; f: number }) {
  const p = raw as Partial<{ u: number; f: number }> | undefined
  return p && typeof p.u === 'number' && typeof p.f === 'number' ? { u: p.u, f: p.f } : fallback
}

/* ---------- Shoe sizes ---------- */

export const EU_SIZES = Array.from({ length: 29 }, (_, i) => 35 + i * 0.5)

/** Approximate conversions (they vary by brand). */
export function sizeInfo(eu: number) {
  const fmt = (n: number) => (Math.round(n * 2) / 2).toString()
  return {
    eu: fmt(eu),
    usMen: fmt(eu - 33.5),
    usWomen: fmt(eu - 32),
    uk: fmt(eu - 34),
    /** Paris point: EU size = 1.5 × last length in cm. */
    lastMm: Math.round((eu * 20) / 3),
    footMm: Math.round((eu * 20) / 3 - 15),
  }
}

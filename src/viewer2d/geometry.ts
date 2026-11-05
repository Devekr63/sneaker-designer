import { clampShape } from '../domain/shape'
import type { BendId, CustomPart, PartPoint, ShapeParams, UH } from '../domain/types'

/**
 * Parametric sneaker geometry (side view, toe on the left).
 *
 * Everything is generated from ShapeParams: a handful of anchor points
 * (toe, throat, collar, heel) plus sole measurements. Curves are Catmull-Rom
 * splines through those anchors. Upper panels (toe box, vamp, heel counter…)
 * are drawn as generous regions and clipped to the upper outline, so they
 * always fit whatever outline the user creates.
 */

export type Pt = [number, number]

export const VIEW_W = 860
export const VIEW_H = 460
export const GROUND = 410

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k]
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const norm = (a: Pt): Pt => {
  const l = Math.hypot(a[0], a[1]) || 1
  return [a[0] / l, a[1] / l]
}
const fmt = (n: number) => Math.round(n * 10) / 10
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/* ---------- Spline helpers ---------- */

type Bez = [Pt, Pt, Pt, Pt]

/** Catmull-Rom spline through `points`, as cubic Bézier segments. */
function catmull(points: Pt[], closed: boolean): Bez[] {
  const n = points.length
  const segs: Bez[] = []
  const count = closed ? n : n - 1
  for (let i = 0; i < count; i++) {
    const p0 = points[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[closed ? (i + 2) % n : Math.min(i + 2, n - 1)]
    segs.push([p1, add(p1, mul(sub(p2, p0), 1 / 6)), sub(p2, mul(sub(p3, p1), 1 / 6)), p2])
  }
  return segs
}

function bezAt(b: Bez, t: number): Pt {
  const m = 1 - t
  const k0 = m * m * m, k1 = 3 * m * m * t, k2 = 3 * m * t * t, k3 = t * t * t
  return [
    k0 * b[0][0] + k1 * b[1][0] + k2 * b[2][0] + k3 * b[3][0],
    k0 * b[0][1] + k1 * b[1][1] + k2 * b[2][1] + k3 * b[3][1],
  ]
}

class PathBuilder {
  d = ''
  move(p: Pt) {
    this.d += `M${fmt(p[0])} ${fmt(p[1])}`
    return this
  }
  line(p: Pt) {
    this.d += `L${fmt(p[0])} ${fmt(p[1])}`
    return this
  }
  curves(segs: Bez[]) {
    for (const s of segs) {
      this.d += `C${fmt(s[1][0])} ${fmt(s[1][1])} ${fmt(s[2][0])} ${fmt(s[2][1])} ${fmt(s[3][0])} ${fmt(s[3][1])}`
    }
    return this
  }
  close() {
    return this.d + 'Z'
  }
}

export function smoothClosed(points: Pt[]): string {
  return new PathBuilder().move(points[0]).curves(catmull(points, true)).close()
}

export function polygon(points: Pt[]): string {
  return 'M' + points.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + 'Z'
}

export function polyline(points: Pt[]): string {
  return points.length ? 'M' + points.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L') : ''
}

/* ---------- Geometry ---------- */

export type HandleId =
  | 'toeNose'
  | 'soleToe'
  | 'toeTop'
  | 'toeCap'
  | 'throat'
  | 'collarFront'
  | 'collarDip'
  | 'heelTop'
  | 'heelBack'
  | 'heelCounter'
  | 'midsoleToe'
  | 'midsoleHeel'

export const HANDLE_LABELS: Record<HandleId, string> = {
  toeNose: 'Toe nose (reach & height)',
  soleToe: 'Sole toe tip',
  toeTop: 'Toe height',
  toeCap: 'Toe cap seam',
  throat: 'Throat (lacing start)',
  collarFront: 'Collar front',
  collarDip: 'Collar dip',
  heelTop: 'Heel height',
  heelBack: 'Heel bulge',
  heelCounter: 'Heel counter seam',
  midsoleToe: 'Midsole (toe)',
  midsoleHeel: 'Midsole (heel)',
}

/** Curve handles: every bend plus the toe spring (the front curve of the sole). */
export type CurveId = BendId | 'toeSpring'

/**
 * A curve handle sits at `base + n · value · scale`. Dragging it projects the pointer
 * onto `n` to get the new value, so it only ever moves along its normal.
 */
export interface CurveHandle {
  at: Pt
  base: Pt
  n: Pt
  scale: number
}

export interface TextAnchor {
  x: number
  y: number
  rotate: number
  size: number
}

export interface Geometry {
  shape: ShapeParams
  tx: number
  L: number
  soleTop: (u: number) => number
  /** Height of the sole's underside above the ground (toe spring, rocker). */
  soleBottom: (u: number) => number
  toAbs: (p: UH) => Pt
  fromAbs: (p: Pt) => UH
  /** Absolute height of the upper's top line at u (piecewise approximation). */
  topH: (u: number) => number
  /** Point at a fraction `f` of the upper's height (0 = sole top, 1 = top line). */
  frac: (u: number, f: number) => Pt
  upper: string
  paths: {
    quarter: string
    toe_box: string
    vamp: string
    overlay: string
    heel_counter: string
    heel_tab: string
    collar: string
    eyestay: string
    tongue: string
    midsole: string
    outsole: string
  }
  tread: string
  eyelets: Pt[]
  laces: string[]
  text: { tongue?: TextAnchor; heel_counter: TextAnchor }
  handles: Record<HandleId, Pt>
  curveHandles: Record<CurveId, CurveHandle>
  /** Outlines of the built-in panels that can be converted into editable parts. */
  outlines: Record<EditablePanel, OutlinePoint[]>
  shadow: { cx: number; cy: number; rx: number }
}

/** Built-in panels whose outline can be turned into an editable custom part. */
export type EditablePanel = 'toe_box' | 'vamp' | 'heel_counter' | 'overlay'
export const EDITABLE_PANELS: EditablePanel[] = ['toe_box', 'vamp', 'heel_counter', 'overlay']

export interface OutlinePoint {
  p: Pt
  /** Sharp corner; the curve doesn't flow smoothly through this point. */
  c?: boolean
}

/**
 * Closed outline through `points`: smooth Catmull-Rom curves, broken at corner points.
 * Between two consecutive corners the run is its own open spline, so a pair of corners
 * gives a straight edge.
 */
export function outlinePath(points: OutlinePoint[]): string {
  const n = points.length
  const first = points.findIndex((q) => q.c)
  if (first < 0) return smoothClosed(points.map((q) => q.p))
  const pb = new PathBuilder().move(points[first].p)
  let run: Pt[] = [points[first].p]
  for (let k = 1; k <= n; k++) {
    const q = points[(first + k) % n]
    run.push(q.p)
    if (q.c) {
      pb.curves(catmull(run, false))
      run = [q.p]
    }
  }
  return pb.close()
}

export function buildGeometry(shape: ShapeParams): Geometry {
  const S = shape
  const L = S.length
  const tx = (VIEW_W - L) / 2

  const B = S.bends
  // Sole bottom: toe spring lifts the front, the rocker lifts the back.
  const springK = (u: number) => (u < 0.34 ? ((0.34 - u) / 0.34) ** 2 : 0)
  const rockerK = (u: number) => (u > 0.75 ? ((u - 0.75) / 0.25) ** 2 : 0)
  const bottomH = (u: number) => S.toeSpring * springK(u) + B.heelRocker * rockerK(u)
  // Midsole thickness ramps from toe to heel; the arch adds a smooth bump (or dip) at mid-foot.
  const archK = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.18) / 0.62)))
  const midT = (u: number) =>
    Math.max(6, S.midsoleToe + (S.midsoleHeel - S.midsoleToe) * smoothstep(0.2, 0.85, u) + B.midsoleArch * archK(u))
  const soleTop = (u: number) => bottomH(u) + S.outsole + midT(u)
  const A = (u: number, hAbs: number): Pt => [tx + u * L, GROUND - hAbs]
  // h ≥ 0: px above the sole. h < 0: percent of the sole's thickness (-100 = ground),
  // so parts placed on the sole stay on it when the sole gets thicker or thinner.
  const toAbs = (p: UH): Pt => {
    const st = soleTop(p.u)
    return A(p.u, p.h >= 0 ? st + p.h : st + (p.h / 100) * st)
  }
  const fromAbs = (p: Pt): UH => {
    const u = (p[0] - tx) / L
    const st = soleTop(u)
    const d = GROUND - p[1] - st
    return { u, h: d >= 0 ? d : (d / st) * 100 }
  }

  /* --- Upper outline --- */
  const curveHandles = {} as Record<CurveId, CurveHandle>
  /**
   * Places a curve control point: `base` pushed along the outward normal of chord a→b
   * (the outline runs toe→heel, so "outward" is away from the shoe). Registers its handle.
   */
  const bent = (id: BendId, base: Pt, a: Pt, b: Pt): Pt => {
    const d = norm(sub(b, a))
    const nOut: Pt = [d[1], -d[0]]
    const at = add(base, mul(nOut, B[id]))
    curveHandles[id] = { at, base, n: nOut, scale: 1 }
    return at
  }

  // The toe end: underside curve → nose → upper-front curve → top of the toe box.
  const nose = S.toeNose
  const toeNose = A(nose.u, soleTop(0) + S.toeHeight * nose.f)
  // Start just behind the nose and below the midsole top (hidden), so the underside drops
  // from the nose straight into the sole instead of tucking back and leaving a gap.
  const ub = Math.max(0.025, nose.u + 0.035)
  const toeBottom = A(ub, soleTop(ub) - 12)
  const toeUnder = bent('toeUnder', A(nose.u + 0.01, soleTop(0) + S.toeHeight * nose.f * 0.4), toeBottom, toeNose)
  const toeTop = toAbs({ u: S.toeTopU, h: S.toeHeight })
  const toeFront = bent(
    'toeRound',
    toAbs({ u: lerp(nose.u, S.toeTopU, 0.3), h: S.toeHeight * lerp(nose.f, 1, 0.72) }),
    toeNose,
    toeTop,
  )
  const throat = toAbs(S.throat)
  const vampMid = bent('vamp', lerpPt(toeTop, throat, 0.5), toeTop, throat)
  const cf = toAbs(S.collarFront)
  const dip = toAbs(S.collarDip)
  const ht = toAbs(S.heelTop)
  const c1 = bent(
    'collarFront',
    toAbs({ u: lerp(S.collarFront.u, S.collarDip.u, 0.5), h: lerp(S.collarFront.h, S.collarDip.h, 0.7) }),
    cf,
    dip,
  )
  const c2 = bent('collarBack', lerpPt(dip, ht, 0.5), dip, ht)
  const heelBack = A(1 + S.heelBulge, soleTop(1) + S.heelTop.h * 0.45)
  const c3 = bent('heel', lerpPt(ht, heelBack, 0.5), ht, heelBack)
  const heelBottom = A(0.99, soleTop(0.99) - 12)

  // The lacing line is a quadratic curve from the throat to the collar front.
  const lacingBase = lerpPt(throat, cf, 0.5)
  const lacingMid = bent('lacing', lacingBase, throat, cf)
  const ctrl = add(lacingBase, mul(sub(lacingMid, lacingBase), 2))
  const along = (t: number): Pt => {
    const m = 1 - t
    return [m * m * throat[0] + 2 * m * t * ctrl[0] + t * t * cf[0], m * m * throat[1] + 2 * m * t * ctrl[1] + t * t * cf[1]]
  }
  const tangent = (t: number): Pt => norm(add(mul(sub(ctrl, throat), 2 * (1 - t)), mul(sub(cf, ctrl), 2 * t)))
  /** Normal pointing into the shoe (down from the lacing line). */
  const inward = (t: number): Pt => {
    const d = tangent(t)
    return [-d[1], d[0]]
  }

  const collarSegs = catmull([cf, c1, dip, c2, ht, c3, heelBack, heelBottom], false)
  const bottomPts: Pt[] = [heelBottom]
  for (let u = 0.94; u > 0.06; u -= 0.06) bottomPts.push(A(u, soleTop(u) - 12))
  bottomPts.push(toeBottom)

  const upper = new PathBuilder()
    .move(toeBottom)
    .curves(catmull([toeBottom, toeUnder, toeNose, toeFront, toeTop, vampMid, throat], false))
    // Quadratic → cubic: control points sit 2/3 of the way toward the quadratic control.
    .curves([[throat, lerpPt(throat, ctrl, 2 / 3), lerpPt(cf, ctrl, 2 / 3), cf]])
    .curves(collarSegs)
    .curves(catmull(bottomPts, false))
    .close()

  /* --- Upper top-line approximation, for placing stripes and templates --- */
  const tops: [number, number][] = [
    [nose.u - 0.002, soleTop(0) + S.toeHeight * nose.f],
    [lerp(nose.u, S.toeTopU, 0.3), soleTop(Math.max(0, S.toeTopU * 0.3)) + S.toeHeight * lerp(nose.f, 1, 0.72)],
    [S.toeTopU, soleTop(S.toeTopU) + S.toeHeight],
    [S.throat.u, soleTop(S.throat.u) + S.throat.h],
    [S.collarFront.u, soleTop(S.collarFront.u) + S.collarFront.h],
    [S.collarDip.u, soleTop(S.collarDip.u) + S.collarDip.h],
    [S.heelTop.u, soleTop(S.heelTop.u) + S.heelTop.h],
    [1.02 + S.heelBulge, soleTop(1) + S.heelTop.h * 0.45],
  ]
  const topH = (u: number) => {
    if (u <= tops[0][0]) return tops[0][1]
    for (let i = 1; i < tops.length; i++) {
      if (u <= tops[i][0]) return lerp(tops[i - 1][1], tops[i][1], (u - tops[i - 1][0]) / (tops[i][0] - tops[i - 1][0]))
    }
    return tops[tops.length - 1][1]
  }
  const frac = (u: number, f: number): Pt => A(u, soleTop(u) + f * (topH(u) - soleTop(u)))

  /* --- Clipped panel regions ---
   * Each panel is an outline of points (corners marked) that extends well past the shoe and
   * is clipped to the upper. The same outlines are what "Edit outline" converts into a custom part. */
  const corner = (p: Pt): OutlinePoint => ({ p, c: true })
  const smoothPt = (p: Pt): OutlinePoint => ({ p })
  const leftRegion = (curve: Pt[]): OutlinePoint[] => [
    corner([-60, curve[0][1]]),
    corner(curve[0]),
    ...curve.slice(1, -1).map(smoothPt),
    corner(curve[curve.length - 1]),
    corner([-60, curve[curve.length - 1][1]]),
  ]
  const rightRegion = (curve: Pt[]): OutlinePoint[] => [
    corner([curve[0][0], -60]),
    corner(curve[0]),
    ...curve.slice(1, -1).map(smoothPt),
    corner(curve[curve.length - 1]),
    corner([VIEW_W + 60, curve[curve.length - 1][1]]),
    corner([VIEW_W + 60, -60]),
  ]

  const tc = S.toeCap
  const toeCapMid = A(tc - 0.022, soleTop(tc) + S.toeHeight * 0.5)
  const hc = S.heelCounter
  const hcBase = soleTop(hc)
  const counterMid = A(hc, hcBase + S.heelTop.h * 0.32)
  const tu = S.throat.u

  const outlines: Record<EditablePanel, OutlinePoint[]> = {
    toe_box: leftRegion([A(tc + 0.012, soleTop(tc) + S.toeHeight + 60), toeCapMid, A(tc + 0.012, soleTop(tc) - 40)]),
    vamp: leftRegion([
      A(tu + 0.055, soleTop(tu) + S.throat.h + 60),
      A(tu + 0.035, soleTop(tu) + S.throat.h * 0.5),
      A(tu + 0.1, soleTop(tu) - 40),
    ]),
    heel_counter: rightRegion([
      A(hc + 0.1, hcBase + S.heelTop.h + 50),
      A(hc + 0.03, hcBase + S.heelTop.h * 0.72),
      counterMid,
      A(hc + 0.015, hcBase - 40),
    ]),
    overlay: ([[0.3, 0.08], [0.47, 0.3], [0.64, 0.5], [0.8, 0.6], [0.775, 0.47], [0.62, 0.34], [0.46, 0.17], [0.34, 0.05]] as const).map(
      ([u, f]) => smoothPt(frac(u, f)),
    ),
  }
  const toe_box = outlinePath(outlines.toe_box)
  const vamp = outlinePath(outlines.vamp)
  const heel_counter = outlinePath(outlines.heel_counter)
  const overlay = outlinePath(outlines.overlay)

  /* --- Collar: a band that follows the ankle opening --- */
  const collarPts: Pt[] = []
  // cf→c1→dip→c2→ht, then a little way down the back of the heel.
  collarSegs.slice(0, 4).forEach((seg, i) => {
    for (let k = i === 0 ? 0 : 1; k <= 8; k++) collarPts.push(bezAt(seg, k / 8))
  })
  for (let k = 1; k <= 4; k++) collarPts.push(bezAt(collarSegs[4], (k / 4) * 0.7))
  const collarTop: Pt[] = []
  const collarBottom: Pt[] = []
  collarPts.forEach((p, i) => {
    const t = norm(sub(collarPts[Math.min(i + 1, collarPts.length - 1)], collarPts[Math.max(i - 1, 0)]))
    const n: Pt = [-t[1], t[0]]
    const w = lerp(S.collarWidth * 0.46, S.collarWidth, Math.min(1, i / (collarPts.length * 0.3)))
    collarTop.push(sub(p, mul(n, 8)))
    collarBottom.push(add(p, mul(n, w)))
  })
  const collar = polygon([...collarTop, ...collarBottom.reverse()])

  /* --- Lacing: eyestay, eyelets, laces, tongue --- */
  const lacingLen = Math.hypot(cf[0] - throat[0], cf[1] - throat[1]) || 1
  const ew = 30
  // Eyestay: a band of width `ew` that follows the (possibly curved) lacing line.
  const t0 = -14 / lacingLen
  const t1 = 1 + 16 / lacingLen
  const eyeTop: Pt[] = []
  const eyeBottom: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const t = lerp(t0, t1, i / 16)
    eyeTop.push(sub(along(t), mul(inward(t), 8)))
    eyeBottom.push(add(along(t), mul(inward(t), i === 0 ? ew * 0.4 : ew)))
  }
  const eyestay = polygon([...eyeTop, ...eyeBottom.reverse()])

  const count = S.eyelets
  const eyeT = Array.from({ length: count }, (_, i) => 0.12 + (0.76 * i) / (count - 1))
  const eyelets: Pt[] = eyeT.map((t) => add(along(t), mul(inward(t), 14)))

  const laces = eyelets.map((e, i) => {
    const n = inward(eyeT[i])
    const a = add(e, mul(n, 2))
    const b = sub(sub(e, mul(n, 26)), mul(tangent(eyeT[i]), 5))
    return `M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}`
  })
  const last = eyelets[eyelets.length - 1]
  const o: Pt = [last[0] - 6, last[1] - 14]
  const rel = (dx: number, dy: number) => `${fmt(o[0] + dx)} ${fmt(o[1] + dy)}`
  laces.push(
    `M${rel(0, 0)}C${rel(30, 2)} ${rel(54, 22)} ${rel(36, 34)}C${rel(22, 42)} ${rel(8, 20)} ${rel(0, 0)}`,
    `M${rel(0, 0)}C${rel(-14, 16)} ${rel(-16, 42)} ${rel(-2, 50)}`,
    `M${rel(0, 0)}C${rel(18, 24)} ${rel(40, 44)} ${rel(60, 46)}`,
  )

  const th = S.tongueHeight
  const off = (t: number, d: number) => add(along(t), mul(inward(t), d))
  const tongue = smoothClosed([
    off(0.02, 18),
    off(0.12, -2),
    off(0.5, -(th * 0.5 + 4)),
    off(0.92, -(th + 4)),
    off(1.06, -(th * 0.85 + 4)),
    off(1.14, -th * 0.3),
    off(1.08, 18),
  ])
  const tonguePos = off(0.96, -(th * 0.5 + 4))
  const tongueDir = tangent(0.96)
  const heelTextPos = frac((hc + 1) / 2 + 0.005, 0.42)

  const heel_tab = smoothClosed([[-20, 16], [-13, -8], [-1, -24], [12, -21], [17, -4], [11, 22]].map(([dx, dy]) => add(ht, [dx, dy])))

  /* --- Sole --- */
  const midBottom: Pt[] = []
  const midTop: Pt[] = []
  const outBottom: Pt[] = []
  const outTop: Pt[] = []
  for (let u = 0.02; u <= 0.981; u += 0.04) {
    midBottom.push(A(u, bottomH(u) + S.outsole - 3))
    midTop.push(A(u, soleTop(u)))
    outBottom.push(A(u, bottomH(u)))
    outTop.push(A(u, bottomH(u) + S.outsole + 2))
  }
  // Sole toe end: a tip point plus two corner points. Bluntness slides the corners
  // forward toward the tip, turning a rounded/pointed front into a squared one.
  const b0 = bottomH(0)
  const st0 = soleTop(0)
  const tipU = S.soleToe.u
  const midTipH = Math.min(st0 - 2, Math.max(b0 + S.outsole * 0.6, b0 + S.soleToe.f * (st0 - b0)))
  // Corners stay a touch behind the tip so the spline doesn't overshoot into a wiggle.
  const cornerU = lerp(0.012, tipU + 0.006, S.soleToeBlunt)
  // Above 60% height the outsole wraps up the front like a rubber bumper.
  const wrap = Math.max(0, (S.soleToe.f - 0.6) / 0.4)
  const outTipH = b0 + S.outsole / 2 + wrap * (midTipH - b0 - S.outsole / 2)
  const outTipU = tipU + 0.004 - 0.009 * wrap
  const midsole = smoothClosed([
    ...midBottom,
    A(1.008 + S.heelBulge * 0.3, (bottomH(1) + S.outsole + soleTop(1)) / 2),
    ...midTop.reverse(),
    A(cornerU, st0 - 1),
    A(tipU, midTipH),
    A(cornerU, b0 + S.outsole - 2),
  ])
  const outsole = smoothClosed([
    ...outBottom,
    A(1.006 + S.heelBulge * 0.3, bottomH(1) + S.outsole / 2),
    ...outTop.reverse(),
    A(lerp(0.012, outTipU + 0.006, S.soleToeBlunt), Math.max(b0 + S.outsole + 2, outTipH + S.outsole * 0.4)),
    A(outTipU, outTipH),
    A(lerp(0.012, outTipU + 0.006, S.soleToeBlunt), b0),
  ])
  // Sole curve handles move straight up/down; `scale` maps a value to its visible offset at that spot.
  const up: Pt = [0, -1]
  const soleHandle = (u: number, hAbs: number, value: number, scale: number): CurveHandle => {
    const at = A(u, hAbs)
    return { at, base: [at[0], at[1] + value * scale], n: up, scale }
  }
  curveHandles.midsoleArch = soleHandle(0.5, soleTop(0.5), B.midsoleArch, archK(0.5))
  curveHandles.heelRocker = soleHandle(0.97, bottomH(0.97), B.heelRocker, rockerK(0.97))
  curveHandles.toeSpring = soleHandle(0.02, bottomH(0.02), S.toeSpring, springK(0.02))

  let tread = ''
  for (let u = 0.04; u <= 0.96; u += 0.025) {
    const x = tx + u * L
    const y = GROUND - bottomH(u)
    tread += `M${fmt(x)} ${fmt(y + 2)}L${fmt(x + 5)} ${fmt(y - S.outsole * 0.75)}`
  }

  return {
    shape: S,
    tx,
    L,
    soleTop,
    toAbs,
    fromAbs,
    topH,
    frac,
    upper,
    paths: { quarter: upper, toe_box, vamp, overlay, heel_counter, heel_tab, collar, eyestay, tongue, midsole, outsole },
    tread,
    eyelets,
    laces,
    text: {
      tongue: th >= 16 ? { x: tonguePos[0], y: tonguePos[1], rotate: (Math.atan2(tongueDir[1], tongueDir[0]) * 180) / Math.PI, size: 11 } : undefined,
      heel_counter: { x: heelTextPos[0], y: heelTextPos[1], rotate: 0, size: 15 },
    },
    soleBottom: bottomH,
    handles: {
      toeNose,
      soleToe: A(tipU, midTipH),
      toeTop,
      toeCap: toeCapMid,
      throat,
      collarFront: cf,
      collarDip: dip,
      heelTop: ht,
      heelBack,
      heelCounter: counterMid,
      midsoleToe: A(0.07, soleTop(0.07)),
      midsoleHeel: A(0.92, soleTop(0.92)),
    },
    curveHandles,
    outlines,
    shadow: { cx: tx + L / 2, cy: GROUND + 4, rx: L / 2 + 30 },
  }
}

/** Converts a dragged curve handle into a bend (or toe-spring) value. */
export function applyCurve(geo: Geometry, id: CurveId, p: Pt): ShapeParams {
  const h = geo.curveHandles[id]
  const v = ((p[0] - h.base[0]) * h.n[0] + (p[1] - h.base[1]) * h.n[1]) / (h.scale || 1)
  const s = structuredClone(geo.shape)
  if (id === 'toeSpring') s.toeSpring = v
  else s.bends[id] = v
  return clampShape(s)
}

/** Converts a dragged handle position back into shape parameters. */
export function applyHandle(geo: Geometry, id: HandleId, p: Pt): ShapeParams {
  const s = structuredClone(geo.shape)
  const uh = geo.fromAbs(p)
  const hAbs = GROUND - p[1]
  switch (id) {
    case 'toeNose':
      s.toeNose = { u: uh.u, f: (hAbs - geo.soleTop(0)) / s.toeHeight }
      break
    case 'soleToe': {
      const b0 = geo.soleBottom(0)
      s.soleToe = { u: uh.u, f: (hAbs - b0) / Math.max(1, geo.soleTop(0) - b0) }
      break
    }
    case 'toeTop':
      s.toeTopU = uh.u
      s.toeHeight = uh.h
      break
    case 'toeCap':
      s.toeCap = uh.u + 0.022
      break
    case 'throat':
    case 'collarFront':
    case 'collarDip':
    case 'heelTop':
      s[id] = uh
      break
    case 'heelBack':
      s.heelBulge = uh.u - 1
      break
    case 'heelCounter':
      s.heelCounter = uh.u
      break
    case 'midsoleToe': {
      const flex = 0.34
      s.midsoleToe = hAbs - s.outsole - s.toeSpring * ((flex - 0.07) / flex) ** 2
      break
    }
    case 'midsoleHeel':
      s.midsoleHeel = hAbs - s.outsole
      break
  }
  return clampShape(s)
}

export function customPartPath(geo: Geometry, part: CustomPart): string {
  if (part.points.length < 3) return ''
  if (!part.smooth) return polygon(part.points.map(geo.toAbs))
  return outlinePath(part.points.map((q) => ({ p: geo.toAbs(q), c: q.c })))
}

/** Turns a built-in panel's outline into custom-part points (shoe-relative, corners kept). */
export function panelToPoints(geo: Geometry, panel: EditablePanel): PartPoint[] {
  return geo.outlines[panel].map(({ p, c }) => (c ? { ...geo.fromAbs(p), c: true } : geo.fromAbs(p)))
}

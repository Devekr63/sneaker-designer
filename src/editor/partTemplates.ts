import { newId } from '../domain/design'
import type { CustomPart, PartStyle, UH } from '../domain/types'
import { GROUND, type Geometry, type Pt } from '../viewer2d/geometry'

export interface PartTemplate {
  id: string
  name: string
  emoji: string
  description: string
  build: (geo: Geometry) => Omit<CustomPart, 'id' | 'name'>
}

const style = (color: string, material: PartStyle['material'] = 'leather'): PartStyle => ({ color, material })

/** Points given as (u, fraction of upper height), so templates fit any silhouette. */
const fracPts = (geo: Geometry, pts: [number, number][]): UH[] => pts.map(([u, f]) => geo.fromAbs(geo.frac(u, f)))

const ellipse = (geo: Geometry, c: Pt, rx: number, ry: number, n = 12): UH[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return geo.fromAbs([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry])
  })

const star = (geo: Geometry, c: Pt, outer: number, inner: number, spikes = 5): UH[] =>
  Array.from({ length: spikes * 2 }, (_, i) => {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    return geo.fromAbs([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r])
  })

const offsets = (geo: Geometry, c: Pt, pts: [number, number][]): UH[] => pts.map(([dx, dy]) => geo.fromAbs([c[0] + dx, c[1] + dy]))

export const PART_TEMPLATES: PartTemplate[] = [
  {
    id: 'mudguard',
    name: 'Mudguard',
    emoji: '🛡️',
    description: 'Wraps the bottom of the upper',
    build: (geo) => ({
      points: fracPts(geo, [[-0.03, 0.32], [0.2, 0.24], [0.5, 0.2], [0.8, 0.24], [1.05, 0.34], [1.05, -0.4], [-0.03, -0.4]]),
      smooth: true, clip: true, onTop: false, style: style('#1F2A44', 'suede'),
    }),
  },
  {
    id: 'heel-wing',
    name: 'Heel Wing',
    emoji: '🪽',
    description: 'Sweeping overlay at the back',
    build: (geo) => ({
      points: fracPts(geo, [[0.64, -0.3], [0.67, 0.3], [0.78, 0.64], [0.92, 0.84], [1.07, 0.92], [1.07, -0.3]]),
      smooth: true, clip: true, onTop: false, style: style('#E4572E'),
    }),
  },
  {
    id: 'toe-bumper',
    name: 'Toe Bumper',
    emoji: '🥾',
    description: 'Rubber guard on the toe',
    build: (geo) => ({
      points: fracPts(geo, [[-0.05, -0.3], [-0.05, 0.55], [0.05, 0.42], [0.11, 0.18], [0.13, -0.3]]),
      smooth: true, clip: true, onTop: false, style: style('#151515', 'rubber'),
    }),
  },
  {
    id: 'window',
    name: 'Mesh Window',
    emoji: '🪟',
    description: 'Breathable side panel',
    build: (geo) => ({
      points: ellipse(geo, geo.frac(0.5, 0.45), 46, 22),
      smooth: true, clip: true, onTop: false, style: style('#D9D6CF', 'mesh'),
    }),
  },
  {
    id: 'star',
    name: 'Star Badge',
    emoji: '⭐',
    description: 'Five-point star logo',
    build: (geo) => ({
      points: star(geo, geo.frac(0.62, 0.44), 26, 11),
      smooth: false, clip: false, onTop: false, style: style('#F6C445'),
    }),
  },
  {
    id: 'circle',
    name: 'Circle Badge',
    emoji: '⚪',
    description: 'Round logo patch',
    build: (geo) => ({
      points: ellipse(geo, geo.frac(0.64, 0.44), 20, 20),
      smooth: true, clip: false, onTop: false, style: style('#C1121F'),
    }),
  },
  {
    id: 'bolt',
    name: 'Lightning Bolt',
    emoji: '⚡',
    description: 'Sharp-edged graphic',
    build: (geo) => ({
      points: offsets(geo, geo.frac(0.56, 0.44), [[-8, -30], [16, -30], [4, -6], [18, -6], [-12, 32], [-2, 4], [-16, 4]]),
      smooth: false, clip: false, onTop: false, style: style('#F6C445', 'patent'),
    }),
  },
  {
    id: 'strap',
    name: 'Velcro Strap',
    emoji: '🎗️',
    description: 'Strap across the laces',
    build: (geo) => {
      const t = geo.handles.throat
      const c = geo.handles.collarFront
      const dir: Pt = [(c[0] - t[0]) / Math.hypot(c[0] - t[0], c[1] - t[1]), (c[1] - t[1]) / Math.hypot(c[0] - t[0], c[1] - t[1])]
      const n: Pt = [-dir[1], dir[0]]
      const p: Pt = [t[0] + (c[0] - t[0]) * 0.42, t[1] + (c[1] - t[1]) * 0.42]
      const at = (a: number, b: number): Pt => [p[0] + dir[0] * a + n[0] * b, p[1] + dir[1] * a + n[1] * b]
      return {
        points: [at(-18, -34), at(18, -34), at(26, 92), at(-10, 92)].map(geo.fromAbs),
        smooth: false, clip: false, onTop: true, style: style('#151515', 'canvas'),
      }
    },
  },
  {
    id: 'ankle-strap',
    name: 'Ankle Strap',
    emoji: '🔗',
    description: 'Band around the collar',
    build: (geo) => {
      const s = geo.shape
      return {
        points: fracPts(geo, [[s.collarFront.u + 0.01, 1.04], [s.heelTop.u + 0.03, 1.02], [s.heelTop.u + 0.03, 0.84], [s.collarFront.u + 0.01, 0.86]]),
        smooth: false, clip: false, onTop: true, style: style('#E4572E'),
      }
    },
  },
  {
    id: 'sole-window',
    name: 'Air Window',
    emoji: '🫧',
    description: 'Visible cushioning unit in the midsole',
    build: (geo) => {
      const u = 0.8
      const top = geo.soleTop(u)
      const mid = (top + geo.shape.outsole) / 2
      const ry = Math.max(5, Math.min(16, (top - geo.shape.outsole) * 0.28))
      return {
        points: ellipse(geo, [geo.tx + u * geo.L, GROUND - mid], 40, ry),
        smooth: true, clip: false, onTop: true, style: { color: '#7FB7E6', material: 'rubber', translucent: true },
      }
    },
  },
]

export function createCustomPart(geo: Geometry, template: PartTemplate, existing: CustomPart[]): CustomPart {
  const sameName = existing.filter((p) => p.name.startsWith(template.name)).length
  return {
    id: `cp_${newId().replace(/-/g, '').slice(0, 10)}`,
    name: sameName ? `${template.name} ${sameName + 1}` : template.name,
    ...template.build(geo),
  }
}

export function createDrawnPart(geo: Geometry, pts: Pt[], existing: CustomPart[]): CustomPart {
  const n = existing.filter((p) => p.name.startsWith('Custom Shape')).length + 1
  return {
    id: `cp_${newId().replace(/-/g, '').slice(0, 10)}`,
    name: `Custom Shape ${n}`,
    points: pts.map(geo.fromAbs),
    smooth: true,
    clip: false,
    onTop: false,
    style: { color: '#FF5A36', material: 'leather' },
  }
}

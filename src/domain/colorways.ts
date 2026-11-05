import { hsl } from './color'
import type { Parts } from './types'

/** A colorway assigns colors by role; materials and text on the design are kept. */
export interface Colorway {
  name: string
  base: string
  toe: string
  accent: string
  pop: string
  laces: string
  midsole: string
  outsole: string
  speckle?: boolean
  translucent?: boolean
}

export const COLORWAYS: Colorway[] = [
  { name: 'Navy Classic', base: '#F5F4F0', toe: '#E9E7E1', accent: '#1F2A44', pop: '#E4572E', laces: '#FFFFFF', midsole: '#F7F3EA', outsole: '#B5835A' },
  { name: 'Triple Black', base: '#1A1A1A', toe: '#222222', accent: '#0E0E0E', pop: '#3A3A3A', laces: '#151515', midsole: '#1C1C1C', outsole: '#111111' },
  { name: 'Sunset Run', base: '#FFF4E6', toe: '#FFD8A8', accent: '#FF6B35', pop: '#7B2CBF', laces: '#FF6B35', midsole: '#FFFFFF', outsole: '#7B2CBF', speckle: true },
  { name: 'Tokyo Night', base: '#1A1A2E', toe: '#16213E', accent: '#E94560', pop: '#00C2D1', laces: '#E94560', midsole: '#0F3460', outsole: '#00C2D1', translucent: true },
  { name: 'Forest Trail', base: '#E8E2D0', toe: '#3A5A40', accent: '#588157', pop: '#F6C445', laces: '#3A5A40', midsole: '#DAD7CD', outsole: '#6B4226' },
  { name: 'Cotton Candy', base: '#FFFFFF', toe: '#F7C8D0', accent: '#C3B1E1', pop: '#7FB7E6', laces: '#F7C8D0', midsole: '#FFFFFF', outsole: '#C3B1E1', translucent: true },
  { name: 'Chicago Red', base: '#FFFFFF', toe: '#C1121F', accent: '#151515', pop: '#C1121F', laces: '#FFFFFF', midsole: '#FFFFFF', outsole: '#C1121F' },
]

export function applyColorway(parts: Parts, c: Colorway): Parts {
  const next = structuredClone(parts)
  const set = (id: keyof Parts, color: string) => (next[id] = { ...next[id], color })
  set('quarter', c.base)
  set('vamp', c.base)
  set('tongue', c.base)
  set('toe_box', c.toe)
  set('overlay', c.accent)
  set('eyestay', c.accent)
  set('collar', c.accent)
  set('heel_counter', c.accent)
  set('heel_tab', c.pop)
  set('laces', c.laces)
  set('midsole', c.midsole)
  set('outsole', c.outsole)
  next.midsole.speckle = !!c.speckle
  next.outsole.translucent = !!c.translucent
  return next
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** Generates a harmonious random colorway from a base hue. */
export function randomColorway(): Colorway {
  const h = Math.random() * 360
  const scheme = pick([150, 180, 210, 30, 120])
  const darkBase = Math.random() < 0.3
  const base = darkBase ? hsl(h, rand(10, 30), rand(10, 18)) : hsl(h, rand(5, 25), rand(92, 97))
  const accent = hsl(h, rand(55, 85), rand(35, 55))
  const pop = hsl(h + scheme, rand(70, 95), rand(50, 62))
  return {
    name: 'Random',
    base,
    toe: Math.random() < 0.5 ? base : hsl(h, rand(20, 50), darkBase ? 22 : 85),
    accent,
    pop,
    laces: pick([base, accent, pop, '#FFFFFF']),
    midsole: darkBase ? hsl(h, 10, rand(12, 25)) : pick(['#FFFFFF', '#F7F3EA', hsl(h, 20, 94)]),
    outsole: pick(['#B5835A', '#151515', accent, pop, '#FFFFFF']),
    speckle: Math.random() < 0.25,
    translucent: Math.random() < 0.25,
  }
}

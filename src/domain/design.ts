import { DEFAULT_SHAPE, parseShape } from './shape'
import type { CustomPart, Design, MaterialId, PartPoint, Parts, ShapeParams } from './types'

export const DEFAULT_PARTS: Parts = {
  toe_box: { color: '#E9E7E1', material: 'suede' },
  vamp: { color: '#FFFFFF', material: 'mesh' },
  quarter: { color: '#F5F4F0', material: 'leather' },
  overlay: { color: '#1F2A44', material: 'leather' },
  eyestay: { color: '#1F2A44', material: 'leather' },
  laces: { color: '#FFFFFF', material: 'canvas' },
  tongue: { color: '#F2F2F2', material: 'mesh', text: 'SR-01' },
  collar: { color: '#1F2A44', material: 'suede' },
  heel_counter: { color: '#1F2A44', material: 'suede', text: 'STRIDE' },
  heel_tab: { color: '#E4572E', material: 'leather' },
  midsole: { color: '#F7F3EA', material: 'foam', speckle: false },
  outsole: { color: '#B5835A', material: 'rubber', translucent: false },
}

const HEX = /^#[0-9a-fA-F]{6}$/
const MATERIALS: MaterialId[] = ['leather', 'suede', 'mesh', 'knit', 'canvas', 'patent', 'foam', 'rubber']

export function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `dsg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  }
}

export function createDesign(
  init: { parts?: Parts; shape?: ShapeParams; customParts?: CustomPart[]; sizeEU?: number; name?: string } = {},
): Design {
  const now = new Date().toISOString()
  return {
    id: newId(),
    name: init.name ?? 'Untitled Sneaker',
    version: 2,
    sizeEU: init.sizeEU ?? 42,
    shape: structuredClone(init.shape ?? DEFAULT_SHAPE),
    parts: structuredClone(init.parts ?? DEFAULT_PARTS),
    customParts: structuredClone(init.customParts ?? []),
    createdAt: now,
    updatedAt: now,
  }
}

function parseCustomPart(raw: unknown): CustomPart | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<CustomPart>
  if (typeof r.id !== 'string' || !Array.isArray(r.points)) return null
  const points = r.points
    .filter((p): p is PartPoint => !!p && Number.isFinite(p.u) && Number.isFinite(p.h))
    .slice(0, 200)
    .map((p) => (p.c ? { u: p.u, h: p.h, c: true } : { u: p.u, h: p.h }))
  if (points.length < 3 || !r.style || !HEX.test(r.style.color)) return null
  return {
    id: r.id.startsWith('cp_') ? r.id : `cp_${r.id}`,
    name: typeof r.name === 'string' ? r.name.slice(0, 40) : 'Custom Part',
    points,
    smooth: r.smooth !== false,
    clip: !!r.clip,
    onTop: !!r.onTop,
    style: {
      color: r.style.color,
      material: MATERIALS.includes(r.style.material) ? r.style.material : 'leather',
      translucent: !!r.style.translucent,
      hidden: !!r.style.hidden,
      stitch: !!r.style.stitch,
    },
  }
}

/**
 * Validates untrusted JSON (imports, localStorage) and fills any missing fields with defaults.
 * Version 1 designs (fixed silhouette, no custom parts) load with the default shape.
 */
export function parseDesign(raw: unknown): Design | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Design>
  if (!r.parts || typeof r.parts !== 'object') return null
  const parts = structuredClone(DEFAULT_PARTS)
  for (const key of Object.keys(parts) as (keyof Parts)[]) {
    const p = (r.parts as Partial<Parts>)[key]
    if (p && typeof p.color === 'string' && HEX.test(p.color)) {
      parts[key] = { ...parts[key], ...p, material: MATERIALS.includes(p.material) ? p.material : parts[key].material }
    }
  }
  const now = new Date().toISOString()
  return {
    id: typeof r.id === 'string' ? r.id : newId(),
    name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 60) : 'Imported Sneaker',
    version: 2,
    sizeEU: typeof r.sizeEU === 'number' && r.sizeEU >= 35 && r.sizeEU <= 49 ? r.sizeEU : 42,
    shape: parseShape(r.shape),
    parts,
    customParts: Array.isArray(r.customParts)
      ? r.customParts.map(parseCustomPart).filter((p): p is CustomPart => p !== null)
      : [],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  }
}

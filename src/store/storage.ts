import { parseDesign } from '../domain/design'
import type { Design } from '../domain/types'

const GALLERY_KEY = 'sneaker-designer:gallery'
const DRAFT_KEY = 'sneaker-designer:draft'
const REFERENCE_KEY = 'sneaker-designer:reference'

/** A sketch or photo shown on the canvas for tracing. Kept apart from designs so saves stay small. */
export interface ReferenceImage {
  src: string
  opacity: number
  flip: boolean
  /** Offset from the canvas origin, px. */
  x: number
  y: number
  scale: number
  /** Over the shoe (multiplied, for tracing) or behind it. */
  onTop: boolean
  visible: boolean
}

export function loadReference(): ReferenceImage | null {
  try {
    const r = JSON.parse(localStorage.getItem(REFERENCE_KEY) ?? 'null') as ReferenceImage | null
    return r && typeof r.src === 'string' && r.src.startsWith('data:image/') ? r : null
  } catch {
    return null
  }
}

/** Returns false when the image is too big for browser storage (it still works until reload). */
export function saveReference(ref: ReferenceImage | null): boolean {
  try {
    if (ref) localStorage.setItem(REFERENCE_KEY, JSON.stringify(ref))
    else localStorage.removeItem(REFERENCE_KEY)
    return true
  } catch {
    return false
  }
}

// localStorage can throw (private mode, quota, blocked storage), so every access is guarded.

export function loadGallery(): Design[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GALLERY_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.map(parseDesign).filter((d): d is Design => d !== null) : []
  } catch {
    return []
  }
}

function writeGallery(designs: Design[]): boolean {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(designs))
    return true
  } catch {
    return false
  }
}

/** Inserts or replaces by id; newest first. Returns the new gallery, or null if storage failed. */
export function saveToGallery(design: Design): Design[] | null {
  const next = [design, ...loadGallery().filter((d) => d.id !== design.id)]
  return writeGallery(next) ? next : null
}

export function deleteFromGallery(id: string): Design[] {
  const next = loadGallery().filter((d) => d.id !== id)
  writeGallery(next)
  return next
}

export function loadDraft(): Design | null {
  try {
    return parseDesign(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'))
  } catch {
    return null
  }
}

export function saveDraft(design: Design): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(design))
  } catch {
    /* draft autosave is best-effort */
  }
}

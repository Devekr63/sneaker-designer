import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Pt } from '../viewer2d/geometry'

/** Converts a client (screen) position to SVG user-space coordinates. */
export function svgPoint(el: Element, clientX: number, clientY: number): Pt {
  const svg = el instanceof SVGSVGElement ? el : (el as SVGElement).ownerSVGElement
  const m = svg?.getScreenCTM()
  if (!m) return [0, 0]
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse())
  return [p.x, p.y]
}

/** Starts a pointer drag on the event's element; `onMove` gets the current and starting SVG points. */
export function beginDrag(e: ReactPointerEvent<Element>, onMove: (p: Pt, start: Pt) => void) {
  if (e.button !== 0) return
  e.stopPropagation()
  const el = e.currentTarget
  try {
    // Keeps the drag alive when the pointer leaves the element.
    el.setPointerCapture(e.pointerId)
  } catch {
    /* pointer already released; the listeners below still work while over the element */
  }
  const start = svgPoint(el, e.clientX, e.clientY)
  const move = (ev: PointerEvent) => onMove(svgPoint(el, ev.clientX, ev.clientY), start)
  const end = () => {
    el.removeEventListener('pointermove', move as EventListener)
    el.removeEventListener('pointerup', end)
    el.removeEventListener('pointercancel', end)
  }
  el.addEventListener('pointermove', move as EventListener)
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', end)
}

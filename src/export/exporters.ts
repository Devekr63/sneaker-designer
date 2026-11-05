import { parseDesign } from '../domain/design'
import type { Design } from '../domain/types'
import { VIEW_H, VIEW_W } from '../viewer2d/geometry'

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sneaker'
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Renders the live SVG (minus editor overlays) onto a canvas and downloads a PNG. */
export async function exportPng(svg: SVGSVGElement, design: Design, scale = 2): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-ui]').forEach((n) => n.remove())
  clone.setAttribute('width', String(VIEW_W * scale))
  clone.setAttribute('height', String(VIEW_H * scale))

  const svgText = new XMLSerializer().serializeToString(clone)
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not render the SVG'))
      img.src = url
    })

    const pad = 40 * scale
    const footer = 56 * scale
    const canvas = document.createElement('canvas')
    canvas.width = VIEW_W * scale + pad * 2
    canvas.height = VIEW_H * scale + pad + footer
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')

    ctx.fillStyle = '#F6F5F2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, pad, pad)

    ctx.fillStyle = '#151515'
    ctx.font = `700 ${22 * scale}px 'Segoe UI', system-ui, sans-serif`
    ctx.fillText(design.name, pad, canvas.height - footer / 2)
    ctx.fillStyle = '#8A877F'
    ctx.font = `500 ${13 * scale}px 'Segoe UI', system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(`EU ${design.sizeEU} · Sneaker Designer`, canvas.width - pad, canvas.height - footer / 2)

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('PNG encoding failed')
    download(blob, `${slug(design.name)}.png`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function exportJson(design: Design): void {
  download(new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' }), `${slug(design.name)}.json`)
}

export async function importJson(file: File): Promise<Design> {
  const design = parseDesign(JSON.parse(await file.text()))
  if (!design) throw new Error('That file is not a sneaker design')
  return design
}

import { useRef } from 'react'
import type { ReferenceImage } from '../store/storage'

interface Props {
  reference: ReferenceImage | null
  onChange: (ref: ReferenceImage | null) => void
  onError: (message: string) => void
}

const MAX_SIDE = 1600

/** Reads an image file and downsizes it so it fits comfortably in browser storage. */
async function loadImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('That file is not an image the browser can open'))
      img.src = url
    })
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * k)
    canvas.height = Math.round(img.height * k)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    // White behind transparent PNGs so "multiply" tracing mode stays clean.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function ReferencePanel({ reference, onChange, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      const src = await loadImage(file)
      onChange({ src, opacity: 0.5, flip: false, x: 0, y: 0, scale: 1, onTop: true, visible: true })
    } catch (err) {
      onError((err as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const set = (patch: Partial<ReferenceImage>) => reference && onChange({ ...reference, ...patch })

  const slider = (label: string, key: 'opacity' | 'scale' | 'x' | 'y', min: number, max: number, step: number, show: (v: number) => string) =>
    reference && (
      <label className="slider">
        <span className="slider-head">
          <span>{label}</span>
          <span className="slider-value">{show(reference[key])}</span>
        </span>
        <input type="range" min={min} max={max} step={step} value={reference[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} />
      </label>
    )

  return (
    <section className="panel reference-panel">
      <span className="field-label">Reference sketch</span>
      {!reference ? (
        <>
          <p className="hint">Upload a drawing or photo of a side view and trace over it with the handles, the pen tool and editable panels.</p>
          <button className="btn reference-upload" onClick={() => fileRef.current?.click()}>
            🖼️ Upload a sketch
          </button>
        </>
      ) : (
        <>
          <div className="reference-head">
            <img src={reference.src} alt="Reference sketch" className="reference-thumb" />
            <div className="btn-row">
              <button className="btn" onClick={() => set({ visible: !reference.visible })}>{reference.visible ? 'Hide' : 'Show'}</button>
              <button className="btn" onClick={() => set({ flip: !reference.flip })} title="Mirror left ↔ right (the editor's toe points left)">
                ⇋ Flip
              </button>
              <button className="btn" onClick={() => fileRef.current?.click()}>Replace</button>
              <button className="btn danger" onClick={() => onChange(null)}>Remove</button>
            </div>
          </div>
          <div className="segmented">
            <button className={reference.onTop ? 'is-active' : ''} onClick={() => set({ onTop: true })}>Over the shoe</button>
            <button className={!reference.onTop ? 'is-active' : ''} onClick={() => set({ onTop: false })}>Behind the shoe</button>
          </div>
          {slider('Opacity', 'opacity', 0.1, 1, 0.05, (v) => `${Math.round(v * 100)}%`)}
          {slider('Size', 'scale', 0.4, 3, 0.01, (v) => `${Math.round(v * 100)}%`)}
          {slider('Move left / right', 'x', -600, 600, 1, (v) => `${Math.round(v)}`)}
          {slider('Move up / down', 'y', -400, 400, 1, (v) => `${Math.round(v)}`)}
          <p className="hint">Tip: flip the sketch so its toe points left, then size it until its sole lines up with the shoe.</p>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </section>
  )
}

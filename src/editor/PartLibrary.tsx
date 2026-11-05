import { useEffect } from 'react'
import { PART_TEMPLATES, type PartTemplate } from './partTemplates'

interface Props {
  onPick: (t: PartTemplate) => void
  onDraw: () => void
  onClose: () => void
}

export function PartLibrary({ onPick, onDraw, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Add a part" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Add a part</h2>
          <button className="btn icon" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <button className="draw-card" onClick={onDraw}>
          <span className="draw-icon">✏️</span>
          <span>
            <strong>Draw your own shape</strong>
            <span className="hint">Click points on the shoe to outline any panel, logo or overlay.</span>
          </span>
        </button>

        <p className="field-label library-label">Or start from a template</p>
        <div className="library-grid">
          {PART_TEMPLATES.map((t) => (
            <button key={t.id} className="library-item" onClick={() => onPick(t)}>
              <span className="library-emoji">{t.emoji}</span>
              <strong>{t.name}</strong>
              <span className="hint">{t.description}</span>
            </button>
          ))}
        </div>
        <p className="hint">Every added part can be reshaped point by point, moved, colored and layered.</p>
      </div>
    </div>
  )
}

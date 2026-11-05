import type { Design } from '../domain/types'
import { SneakerSvg } from '../viewer2d/SneakerSvg'

interface Props {
  designs: Design[]
  currentId: string
  onOpen: (d: Design) => void
  onDelete: (d: Design) => void
}

export function Gallery({ designs, currentId, onOpen, onDelete }: Props) {
  return (
    <section className="panel gallery">
      <h2 className="panel-title">My Designs <span className="count">{designs.length}</span></h2>
      {designs.length === 0 ? (
        <p className="hint">No saved designs yet. Press <kbd>Save</kbd> to keep your current sneaker here.</p>
      ) : (
        <ul className="gallery-grid">
          {designs.map((d) => (
            <li key={d.id} className={`gallery-card${d.id === currentId ? ' is-current' : ''}`}>
              <button className="gallery-open" onClick={() => onOpen(d)} title={`Open ${d.name}`}>
                <SneakerSvg design={d} className="thumb" title={d.name} />
                <span className="gallery-name">{d.name}</span>
                <span className="gallery-date">{new Date(d.updatedAt).toLocaleDateString()}</span>
              </button>
              <button className="gallery-delete" onClick={() => onDelete(d)} aria-label={`Delete ${d.name}`} title="Delete">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

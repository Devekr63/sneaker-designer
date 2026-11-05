import { MATERIAL_LABELS } from '../domain/materials'
import { PART_DEFS } from '../domain/parts'
import type { CustomPart, PartId, Parts, SelectId } from '../domain/types'

interface Props {
  parts: Parts
  customParts: CustomPart[]
  selected: SelectId | null
  onSelect: (id: SelectId) => void
  onHover: (id: SelectId | null) => void
  onToggleHidden: (id: PartId) => void
  onAdd: () => void
}

export function PartList({ parts, customParts, selected, onSelect, onHover, onToggleHidden, onAdd }: Props) {
  const row = (id: SelectId, label: string, meta: string, color: string, hidden = false) => (
    <button
      className={`part-row${selected === id ? ' is-selected' : ''}${hidden ? ' is-hidden' : ''}`}
      onClick={() => onSelect(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      aria-pressed={selected === id}
    >
      <span className="dot" style={{ background: color }} />
      <span className="part-row-text">
        <span className="part-row-label">{label}</span>
        <span className="part-row-meta">{hidden ? 'Hidden' : meta}</span>
      </span>
    </button>
  )

  return (
    <nav className="panel part-list" aria-label="Shoe parts">
      <h2 className="panel-title">Parts</h2>
      <ul>
        {PART_DEFS.map((def) => {
          const style = parts[def.id]
          return (
            <li key={def.id} className="part-item">
              {row(
                def.id,
                def.label,
                def.allowedMaterials.length > 1 ? MATERIAL_LABELS[style.material] : style.color.toUpperCase(),
                style.color,
                style.hidden,
              )}
              {def.removable && (
                <button
                  className="eye"
                  onClick={() => onToggleHidden(def.id)}
                  title={style.hidden ? `Show ${def.label}` : `Hide ${def.label}`}
                  aria-label={style.hidden ? `Show ${def.label}` : `Hide ${def.label}`}
                >
                  {style.hidden ? '◌' : '●'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <h2 className="panel-title custom-title">Your parts</h2>
      {customParts.length > 0 && (
        <ul>
          {[...customParts].reverse().map((cp) => (
            <li key={cp.id} className="part-item">
              {row(cp.id, cp.name, `${MATERIAL_LABELS[cp.style.material]}${cp.onTop ? ' · top' : ''}`, cp.style.color)}
            </li>
          ))}
        </ul>
      )}
      <button className="add-part" onClick={onAdd}>
        ＋ Add a part
      </button>
    </nav>
  )
}

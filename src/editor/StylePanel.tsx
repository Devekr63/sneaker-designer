import { HEX_RE } from '../domain/color'
import { MATERIAL_LABELS, SWATCHES } from '../domain/materials'
import { ALL_MATERIALS, PART_BY_ID, isCustomId } from '../domain/parts'
import type { CustomPart, Design, MaterialId, PartOption, PartStyle, SelectId } from '../domain/types'
import { EDITABLE_PANELS } from '../viewer2d/geometry'

interface Props {
  selected: SelectId | null
  design: Design
  onStyle: (patch: Partial<PartStyle>) => void
  onCustom: (patch: Partial<CustomPart>) => void
  onDeleteCustom: () => void
  onDuplicateCustom: () => void
  onLayer: (dir: 1 | -1) => void
  /** Converts the selected built-in panel into an editable custom part. */
  onEditOutline: () => void
}

export function StylePanel({ selected, design, onStyle, onCustom, onDeleteCustom, onDuplicateCustom, onLayer, onEditOutline }: Props) {
  const custom = isCustomId(selected) ? design.customParts.find((c) => c.id === selected) : undefined
  const def = selected && !custom ? PART_BY_ID[selected as keyof typeof PART_BY_ID] : undefined

  if (!custom && !def) {
    return (
      <section className="panel style-panel empty">
        <p className="hint">👆 Click a part of the sneaker (or pick one from the list) to customize it.</p>
      </section>
    )
  }

  const style: PartStyle = custom ? custom.style : design.parts[def!.id]
  const materials: MaterialId[] = custom ? ALL_MATERIALS : def!.allowedMaterials
  const options: PartOption[] = custom ? ['translucent'] : (def!.options ?? [])
  const index = custom ? design.customParts.indexOf(custom) : -1

  const commitHex = (input: HTMLInputElement) => {
    const v = input.value.trim()
    const hex = v.startsWith('#') ? v : `#${v}`
    if (HEX_RE.test(hex)) onStyle({ color: hex.toUpperCase() })
    else input.value = style.color
  }

  return (
    <section className="panel style-panel">
      <header className="style-head">
        <span className="dot dot-lg" style={{ background: style.color }} />
        <div className="style-head-text">
          {custom ? (
            <input
              className="part-name-input"
              value={custom.name}
              maxLength={40}
              onChange={(e) => onCustom({ name: e.target.value })}
              aria-label="Part name"
            />
          ) : (
            <h2 className="style-title">{def!.label}</h2>
          )}
          <p className="hint">{custom ? 'Your part. Drag it to move it, and drag the white dots to reshape it.' : def!.description}</p>
        </div>
      </header>

      {def?.removable && (
        <label className="toggle">
          <input type="checkbox" checked={!style.hidden} onChange={(e) => onStyle({ hidden: !e.target.checked })} />
          <span>Show this part</span>
        </label>
      )}

      {def && (EDITABLE_PANELS as string[]).includes(def.id) && !style.hidden && (
        <div className="edit-outline">
          <button className="btn" onClick={onEditOutline}>
            ✂️ Edit outline point by point
          </button>
          <p className="hint">Turns this panel into your own part with draggable points, so you can draw any seam line.</p>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="color-input">Color</label>
        <div className="color-row">
          <input
            id="color-input"
            type="color"
            value={style.color.toLowerCase()}
            onChange={(e) => onStyle({ color: e.target.value.toUpperCase() })}
          />
          {/* Uncontrolled draft; the key resets it whenever the color changes elsewhere. */}
          <input
            key={style.color}
            className="hex-input"
            defaultValue={style.color}
            maxLength={7}
            spellCheck={false}
            aria-label="Hex color"
            onBlur={(e) => commitHex(e.currentTarget)}
            onKeyDown={(e) => e.key === 'Enter' && commitHex(e.currentTarget)}
          />
        </div>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className={`swatch${c === style.color.toUpperCase() ? ' is-active' : ''}`}
              style={{ background: c }}
              title={c}
              aria-label={`Use ${c}`}
              onClick={() => onStyle({ color: c })}
            />
          ))}
        </div>
      </div>

      {materials.length > 1 && (
        <div className="field">
          <span className="field-label">Material</span>
          <div className="chips">
            {materials.map((m) => (
              <button
                key={m}
                className={`chip${style.material === m ? ' is-active' : ''}`}
                onClick={() => onStyle({ material: m })}
                aria-pressed={style.material === m}
              >
                {MATERIAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {options.includes('text') && (
        <div className="field">
          <label className="field-label" htmlFor="part-text">Printed text</label>
          <input
            id="part-text"
            className="text-input"
            value={style.text ?? ''}
            maxLength={10}
            placeholder="e.g. SR-01"
            onChange={(e) => onStyle({ text: e.target.value.toUpperCase() })}
          />
        </div>
      )}

      <div className="toggles">
        {selected !== 'laces' && (
          <label className="toggle">
            <input type="checkbox" checked={!!style.stitch} onChange={(e) => onStyle({ stitch: e.target.checked })} />
            <span>Stitching</span>
          </label>
        )}
        {options.includes('speckle') && (
          <label className="toggle">
            <input type="checkbox" checked={!!style.speckle} onChange={(e) => onStyle({ speckle: e.target.checked })} />
            <span>Paint speckle</span>
          </label>
        )}
        {options.includes('translucent') && (
          <label className="toggle">
            <input type="checkbox" checked={!!style.translucent} onChange={(e) => onStyle({ translucent: e.target.checked })} />
            <span>{custom ? 'See-through' : 'Icy / translucent rubber'}</span>
          </label>
        )}
        {custom && (
          <>
            <label className="toggle">
              <input type="checkbox" checked={custom.smooth} onChange={(e) => onCustom({ smooth: e.target.checked })} />
              <span>Smooth curves</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={custom.clip} onChange={(e) => onCustom({ clip: e.target.checked })} />
              <span>Trim to the upper's outline</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={custom.onTop} onChange={(e) => onCustom({ onTop: e.target.checked })} />
              <span>Place above laces &amp; sole</span>
            </label>
          </>
        )}
      </div>

      {custom && (
        <div className="field custom-actions">
          <span className="field-label">Layer &amp; actions</span>
          <div className="btn-row">
            <button className="btn" onClick={() => onLayer(1)} disabled={index === design.customParts.length - 1} title="Bring forward">
              ↑ Forward
            </button>
            <button className="btn" onClick={() => onLayer(-1)} disabled={index === 0} title="Send backward">
              ↓ Back
            </button>
            <button className="btn" onClick={onDuplicateCustom}>Duplicate</button>
            <button className="btn danger" onClick={onDeleteCustom}>Delete</button>
          </div>
          <p className="hint">
            Tips: double-click the edge to add a point, double-click a point to remove it, and <strong>Shift-click</strong> a point to switch
            it between smooth and a sharp corner (■).
          </p>
        </div>
      )}
    </section>
  )
}

import { COLORWAYS, type Colorway } from '../domain/colorways'

interface Props {
  onApply: (c: Colorway) => void
  onRandom: () => void
}

export function ColorwayBar({ onApply, onRandom }: Props) {
  return (
    <div className="colorways">
      <span className="field-label">Colorways</span>
      <div className="colorway-list">
        {COLORWAYS.map((c) => (
          <button key={c.name} className="colorway" onClick={() => onApply(c)} title={`Apply ${c.name}`}>
            <span className="colorway-dots">
              {[c.base, c.accent, c.pop, c.outsole].map((col, i) => (
                <span key={i} style={{ background: col }} />
              ))}
            </span>
            {c.name}
          </button>
        ))}
        <button className="colorway colorway-random" onClick={onRandom} title="Generate a random colorway">
          🎲 Surprise me
        </button>
      </div>
    </div>
  )
}

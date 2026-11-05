import {
  BEND_LABELS,
  BEND_LIMITS,
  clampShape,
  DEFAULT_BENDS,
  EU_SIZES,
  SHAPE_PRESETS,
  sizeInfo,
  TOE_LIMITS,
  TOE_STYLES,
} from '../domain/shape'
import type { BendId, ShapeParams } from '../domain/types'

export type HandleMode = 'points' | 'curves' | 'both'

interface Props {
  shape: ShapeParams
  sizeEU: number
  showRuler: boolean
  handleMode: HandleMode
  onShape: (next: ShapeParams, key: string | null) => void
  onSize: (eu: number) => void
  onToggleRuler: (v: boolean) => void
  onHandleMode: (m: HandleMode) => void
}

interface ToeSlider {
  key: string
  label: string
  min: number
  max: number
  step: number
  get: (s: ShapeParams) => number
  set: (s: ShapeParams, v: number) => ShapeParams
  /** `mmPerU` converts a u-distance to millimetres for the chosen size. */
  show: (v: number, mmPerU: number) => string
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const reach = (v: number, mmPerU: number) => {
  const mm = Math.round(v * mmPerU)
  return mm === 0 ? '0 mm' : mm > 0 ? `${mm} mm forward` : `${-mm} mm back`
}

// Reach sliders store -u so that dragging right pushes the toe forward.
const TOE_SLIDERS: ToeSlider[] = [
  {
    key: 'noseReach', label: 'Toe nose reach', min: -TOE_LIMITS.noseU[1], max: -TOE_LIMITS.noseU[0], step: 0.001,
    get: (s) => -s.toeNose.u, set: (s, v) => ({ ...s, toeNose: { ...s.toeNose, u: -v } }), show: reach,
  },
  {
    key: 'noseHeight', label: 'Toe nose height', min: TOE_LIMITS.noseF[0], max: TOE_LIMITS.noseF[1], step: 0.01,
    get: (s) => s.toeNose.f, set: (s, v) => ({ ...s, toeNose: { ...s.toeNose, f: v } }), show: pct,
  },
  {
    key: 'soleReach', label: 'Sole tip reach', min: -TOE_LIMITS.soleU[1], max: -TOE_LIMITS.soleU[0], step: 0.001,
    get: (s) => -s.soleToe.u, set: (s, v) => ({ ...s, soleToe: { ...s.soleToe, u: -v } }), show: reach,
  },
  {
    key: 'soleHeight', label: 'Sole tip height (high = bumper wrap)', min: 0, max: 1, step: 0.01,
    get: (s) => s.soleToe.f, set: (s, v) => ({ ...s, soleToe: { ...s.soleToe, f: v } }), show: pct,
  },
  {
    key: 'soleBlunt', label: 'Sole tip shape (pointed → square)', min: 0, max: 1, step: 0.01,
    get: (s) => s.soleToeBlunt, set: (s, v) => ({ ...s, soleToeBlunt: v }), show: pct,
  },
]

const HANDLE_MODES: { id: HandleMode; label: string }[] = [
  { id: 'points', label: '● Points' },
  { id: 'curves', label: '■ Curves' },
  { id: 'both', label: 'Both' },
]

interface SliderDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  get: (s: ShapeParams) => number
  set: (s: ShapeParams, v: number) => ShapeParams
  /** How to show the value; `mm` converts canvas px to millimetres for the chosen size. */
  unit: 'mm' | '%' | 'count'
}

const GROUPS: { title: string; sliders: SliderDef[] }[] = [
  {
    title: 'Silhouette',
    sliders: [
      { key: 'length', label: 'Proportions (stubby → sleek)', min: 560, max: 800, step: 2, unit: 'mm', get: (s) => s.length, set: (s, v) => ({ ...s, length: v }) },
      {
        key: 'collar', label: 'Collar height (low → high top)', min: 60, max: 320, step: 1, unit: 'mm',
        get: (s) => s.collarFront.h,
        set: (s, v) => {
          const d = v - s.collarFront.h
          return {
            ...s,
            collarFront: { ...s.collarFront, h: s.collarFront.h + d },
            collarDip: { ...s.collarDip, h: s.collarDip.h + d },
            heelTop: { ...s.heelTop, h: s.heelTop.h + d },
          }
        },
      },
      { key: 'toeHeight', label: 'Toe box height', min: 36, max: 130, step: 1, unit: 'mm', get: (s) => s.toeHeight, set: (s, v) => ({ ...s, toeHeight: v }) },
      { key: 'toeSpring', label: 'Toe spring (lift)', min: 0, max: 40, step: 1, unit: 'mm', get: (s) => s.toeSpring, set: (s, v) => ({ ...s, toeSpring: v }) },
      { key: 'heelBulge', label: 'Heel bulge', min: 0, max: 0.05, step: 0.001, unit: '%', get: (s) => s.heelBulge, set: (s, v) => ({ ...s, heelBulge: v }) },
    ],
  },
  {
    title: 'Sole',
    sliders: [
      { key: 'midsoleToe', label: 'Midsole at toe', min: 12, max: 90, step: 1, unit: 'mm', get: (s) => s.midsoleToe, set: (s, v) => ({ ...s, midsoleToe: v }) },
      { key: 'midsoleHeel', label: 'Midsole at heel', min: 16, max: 130, step: 1, unit: 'mm', get: (s) => s.midsoleHeel, set: (s, v) => ({ ...s, midsoleHeel: v }) },
      { key: 'outsole', label: 'Outsole thickness', min: 4, max: 30, step: 1, unit: 'mm', get: (s) => s.outsole, set: (s, v) => ({ ...s, outsole: v }) },
    ],
  },
  {
    title: 'Panels & lacing',
    sliders: [
      { key: 'toeCap', label: 'Toe cap length', min: 0.12, max: 0.32, step: 0.005, unit: '%', get: (s) => s.toeCap, set: (s, v) => ({ ...s, toeCap: v }) },
      { key: 'heelCounter', label: 'Heel counter size', min: 0.6, max: 0.9, step: 0.005, unit: '%', get: (s) => 1.5 - s.heelCounter, set: (s, v) => ({ ...s, heelCounter: 1.5 - v }) },
      { key: 'collarWidth', label: 'Collar width (padding / trim)', min: 8, max: 60, step: 1, unit: 'mm', get: (s) => s.collarWidth, set: (s, v) => ({ ...s, collarWidth: v }) },
      { key: 'tongueHeight', label: 'Tongue height', min: 0, max: 60, step: 1, unit: 'mm', get: (s) => s.tongueHeight, set: (s, v) => ({ ...s, tongueHeight: v }) },
      { key: 'eyelets', label: 'Eyelets', min: 3, max: 10, step: 1, unit: 'count', get: (s) => s.eyelets, set: (s, v) => ({ ...s, eyelets: v }) },
    ],
  },
]

export function ShapePanel({ shape, sizeEU, showRuler, handleMode, onShape, onSize, onToggleRuler, onHandleMode }: Props) {
  const info = sizeInfo(sizeEU)
  const mmPerPx = info.lastMm / shape.length

  const display = (d: SliderDef, v: number) => {
    if (d.unit === 'count') return String(v)
    if (d.unit === '%') return `${Math.round((d.key === 'heelCounter' ? v - 0.5 : v) * 100)}%`
    // The real length comes from the shoe size; this slider changes proportions (slim vs. stubby).
    if (d.key === 'length') return `${Math.round((v / 720) * 100)}%`
    return `${Math.round(v * mmPerPx)} mm`
  }

  return (
    <section className="panel shape-panel">
      <div className="field">
        <span className="field-label">Start from a style</span>
        <div className="preset-grid">
          {SHAPE_PRESETS.map((p) => (
            <button key={p.name} className="preset" onClick={() => onShape(structuredClone(p.shape), null)}>
              <span className="preset-emoji">{p.emoji}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="size-select">Shoe size</label>
        <div className="size-row">
          <select id="size-select" className="select" value={sizeEU} onChange={(e) => onSize(Number(e.target.value))}>
            {EU_SIZES.map((s) => (
              <option key={s} value={s}>EU {s}</option>
            ))}
          </select>
          <div className="size-info">
            <span>US M {info.usMen}</span>
            <span>US W {info.usWomen}</span>
            <span>UK {info.uk}</span>
          </div>
        </div>
        <p className="hint">
          Last length ≈ <strong>{info.lastMm} mm</strong> (fits a foot of about {info.footMm} mm). Conversions are approximate.
        </p>
        <label className="toggle">
          <input type="checkbox" checked={showRuler} onChange={(e) => onToggleRuler(e.target.checked)} />
          <span>Show measurements on the shoe</span>
        </label>
      </div>

      <div className="field">
        <span className="field-label">Edit on the shoe</span>
        <div className="segmented" role="radiogroup">
          {HANDLE_MODES.map((m) => (
            <button key={m.id} role="radio" aria-checked={handleMode === m.id} className={handleMode === m.id ? 'is-active' : ''} onClick={() => onHandleMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="hint shape-tip">
          <strong style={{ color: 'var(--accent)' }}>● Orange points</strong> move the toe, throat, collar, heel and sole.
          <br />
          <strong style={{ color: '#2F80ED' }}>■ Blue squares</strong> bend the curve between them: drag out to bulge, in to flatten.
          Double-click a square to reset that curve.
        </p>
      </div>

      <div className="field">
        <span className="field-label">Toe end</span>
        <div className="chips toe-styles">
          {TOE_STYLES.map((t) => (
            <button key={t.name} className="chip" onClick={() => onShape(t.apply(shape), null)}>
              {t.name}
            </button>
          ))}
        </div>
        {TOE_SLIDERS.map((d) => {
          const v = d.get(shape)
          return (
            <label className="slider" key={d.key}>
              <span className="slider-head">
                <span>{d.label}</span>
                <span className="slider-value">{d.show(v, shape.length * mmPerPx)}</span>
              </span>
              <input
                type="range"
                min={d.min}
                max={d.max}
                step={d.step}
                value={v}
                onChange={(e) => onShape(clampShape(d.set(shape, Number(e.target.value))), `toe:${d.key}`)}
              />
            </label>
          )
        })}
        <p className="hint">On the shoe, drag the ● nose and the ◆ sole tip at the very front.</p>
      </div>

      <div className="field">
        <div className="field-label-row">
          <span className="field-label">Curves</span>
          <button className="link-btn" onClick={() => onShape(clampShape({ ...shape, bends: { ...DEFAULT_BENDS } }), null)}>
            Reset curves
          </button>
        </div>
        {(Object.keys(BEND_LIMITS) as BendId[]).map((k) => {
          const [min, max] = BEND_LIMITS[k]
          const v = shape.bends[k]
          const mm = Math.round(v * mmPerPx)
          return (
            <label className="slider" key={k}>
              <span className="slider-head">
                <span>{BEND_LABELS[k]}</span>
                <span className="slider-value">{mm > 0 ? `+${mm}` : mm} mm</span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={0.5}
                value={v}
                onChange={(e) => onShape(clampShape({ ...shape, bends: { ...shape.bends, [k]: Number(e.target.value) } }), `bend:${k}`)}
              />
            </label>
          )
        })}
      </div>

      {GROUPS.map((g) => (
        <div className="field" key={g.title}>
          <span className="field-label">{g.title}</span>
          {g.sliders.map((d) => {
            const v = d.get(shape)
            return (
              <label className="slider" key={d.key}>
                <span className="slider-head">
                  <span>{d.label}</span>
                  <span className="slider-value">{display(d, v)}</span>
                </span>
                <input
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={v}
                  onChange={(e) => onShape(clampShape(d.set(shape, Number(e.target.value))), `slider:${d.key}`)}
                />
              </label>
            )
          })}
        </div>
      ))}
    </section>
  )
}

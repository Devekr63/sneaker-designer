import { useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { BEND_LABELS, sizeInfo } from '../domain/shape'
import type { CustomPart } from '../domain/types'
import type { ReferenceImage } from '../store/storage'
import { GROUND, HANDLE_LABELS, polyline, VIEW_H, VIEW_W, type CurveId, type Geometry, type HandleId, type Pt } from '../viewer2d/geometry'
import { beginDrag, svgPoint } from './drag'

const ACCENT = '#FF5A36'
const FONT = "'Segoe UI', system-ui, sans-serif"

function Handle({
  at,
  title,
  onDrag,
  onDoubleClick,
  onShiftClick,
  shape = 'circle',
  size = 7,
}: {
  at: Pt
  title: string
  onDrag: (p: Pt) => void
  onDoubleClick?: () => void
  onShiftClick?: () => void
  shape?: 'circle' | 'diamond' | 'square'
  size?: number
}) {
  const [x, y] = at
  const common = {
    className: 'handle',
    fill: '#fff',
    stroke: ACCENT,
    strokeWidth: 2.5,
    onPointerDown: (e: ReactPointerEvent<SVGElement>) => beginDrag(e, (p) => onDrag(p)),
    onClick: (e: ReactMouseEvent) => {
      e.stopPropagation()
      if (e.shiftKey) onShiftClick?.()
    },
    onDoubleClick: (e: ReactMouseEvent) => {
      e.stopPropagation()
      onDoubleClick?.()
    },
  }
  return (
    <g>
      <title>{title}</title>
      {/* Larger invisible hit area for fingers. */}
      <circle cx={x} cy={y} r={size + 8} {...common} fill="transparent" stroke="none" />
      {shape === 'circle' ? (
        <circle cx={x} cy={y} r={size} {...common} pointerEvents="none" />
      ) : (
        <rect
          x={x - size}
          y={y - size}
          width={size * 2}
          height={size * 2}
          transform={shape === 'diamond' ? `rotate(45 ${x} ${y})` : undefined}
          {...common}
          fill={shape === 'square' ? ACCENT : '#fff'}
          pointerEvents="none"
        />
      )}
    </g>
  )
}

/** Draggable anchors that reshape the silhouette. */
export function ShapeHandles({ geo, onDrag }: { geo: Geometry; onDrag: (id: HandleId, p: Pt) => void }) {
  return (
    <g>
      {/* Faint guide through the outline anchors. */}
      <path
        d={polyline([geo.handles.toeNose, geo.handles.toeTop, geo.handles.throat, geo.handles.collarFront, geo.handles.collarDip, geo.handles.heelTop, geo.handles.heelBack])}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.2}
        strokeDasharray="4 4"
        opacity={0.6}
        pointerEvents="none"
      />
      {(Object.keys(geo.handles) as HandleId[]).map((id) => (
        <Handle
          key={id}
          at={geo.handles[id]}
          title={`${HANDLE_LABELS[id]}: drag to change`}
          shape={['midsoleToe', 'midsoleHeel', 'toeCap', 'heelCounter', 'soleToe'].includes(id) ? 'diamond' : 'circle'}
          size={id === 'toeCap' || id === 'heelCounter' ? 5.5 : 7}
          onDrag={(p) => onDrag(id, p)}
        />
      ))}
    </g>
  )
}

const CURVE = '#2F80ED'

/** Square handles that bend each curve of the outline and sole; double-click resets a curve. */
export function CurveHandles({
  geo,
  onDrag,
  onReset,
}: {
  geo: Geometry
  onDrag: (id: CurveId, p: Pt) => void
  onReset: (id: CurveId) => void
}) {
  return (
    <g>
      {(Object.keys(geo.curveHandles) as CurveId[]).map((id) => {
        const { at, base } = geo.curveHandles[id]
        const [x, y] = at
        const drag = {
          onPointerDown: (e: ReactPointerEvent<SVGElement>) => beginDrag(e, (p) => onDrag(id, p)),
          onClick: (e: ReactMouseEvent) => e.stopPropagation(),
          onDoubleClick: (e: ReactMouseEvent) => {
            e.stopPropagation()
            onReset(id)
          },
        }
        const label = id === 'toeSpring' ? 'Toe spring' : BEND_LABELS[id]
        return (
          <g key={id}>
            <title>{`${label}: drag to bend · double-click to reset`}</title>
            {/* Shows how far the curve has been pushed from its neutral position. */}
            <line x1={base[0]} y1={base[1]} x2={x} y2={y} stroke={CURVE} strokeWidth={1.5} strokeDasharray="3 3" pointerEvents="none" />
            <circle cx={base[0]} cy={base[1]} r={2} fill={CURVE} pointerEvents="none" />
            <circle cx={x} cy={y} r={14} fill="transparent" className="handle" {...drag} />
            <rect x={x - 6} y={y - 6} width={12} height={12} rx={2.5} fill="#fff" stroke={CURVE} strokeWidth={2.5} pointerEvents="none" />
          </g>
        )
      })}
    </g>
  )
}

/** Point handles for a custom part: drag to move, double-click to delete. */
export function VertexHandles({
  geo,
  part,
  onMove,
  onDelete,
  onToggleCorner,
}: {
  geo: Geometry
  part: CustomPart
  onMove: (index: number, p: Pt) => void
  onDelete: (index: number) => void
  onToggleCorner: (index: number) => void
}) {
  return (
    <g>
      {part.points.map((p, i) => (
        <Handle
          key={i}
          at={geo.toAbs(p)}
          size={5.5}
          // Filled squares are sharp corners; circles are smooth points.
          shape={p.c && part.smooth ? 'square' : 'circle'}
          title={`Drag to move · Shift-click: ${p.c ? 'make smooth' : 'make a sharp corner'}${part.points.length > 3 ? ' · double-click to delete' : ''}`}
          onDrag={(pt) => onMove(i, pt)}
          onDoubleClick={() => onDelete(i)}
          onShiftClick={() => onToggleCorner(i)}
        />
      ))}
    </g>
  )
}

/** Length and heel-height measurements for the chosen shoe size. */
export function Ruler({ geo, sizeEU }: { geo: Geometry; sizeEU: number }) {
  const info = sizeInfo(sizeEU)
  const mmPerPx = info.lastMm / geo.L
  const y = GROUND + 30
  const x0 = geo.tx
  const x1 = geo.tx + geo.L
  const ticks = Math.floor(info.lastMm / 10)
  const heel = geo.handles.heelTop
  const heelMm = Math.round((GROUND - heel[1]) * mmPerPx)
  const hx = Math.min(x1 + 34, 846)
  const ink = 'var(--muted, #7d7a72)'
  return (
    <g pointerEvents="none" fontFamily={FONT} fill={ink}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={ink} strokeWidth={1.2} />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const x = x0 + (i * 10) / mmPerPx
        const major = i % 5 === 0
        return <line key={i} x1={x} y1={y} x2={x} y2={y - (major ? 8 : 4)} stroke={ink} strokeWidth={1} />
      })}
      <line x1={x1} y1={y + 4} x2={x1} y2={y - 10} stroke={ink} strokeWidth={1.2} />
      <text x={(x0 + x1) / 2} y={y + 16} fontSize={12} fontWeight={600} textAnchor="middle">
        {info.lastMm} mm · EU {info.eu} / US M {info.usMen}
      </text>
      <line x1={hx} y1={GROUND} x2={hx} y2={heel[1]} stroke={ink} strokeWidth={1.2} strokeDasharray="3 3" />
      <line x1={hx - 5} y1={heel[1]} x2={hx + 5} y2={heel[1]} stroke={ink} strokeWidth={1.2} />
      <text x={hx} y={heel[1] - 8} fontSize={11} fontWeight={600} textAnchor="middle">
        {heelMm} mm
      </text>
    </g>
  )
}

/** The reference sketch on the canvas. Over the shoe it multiplies, so white paper disappears. */
export function ReferenceLayer({ reference }: { reference: ReferenceImage }) {
  const w = VIEW_W * reference.scale
  const h = VIEW_H * reference.scale
  // Scale around the canvas centre so resizing doesn't push the sketch off to one side.
  const x = (VIEW_W - w) / 2 + reference.x
  const y = (VIEW_H - h) / 2 + reference.y
  const cx = x + w / 2
  return (
    <image
      href={reference.src}
      x={x}
      y={y}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMid meet"
      opacity={reference.opacity}
      transform={reference.flip ? `translate(${cx} 0) scale(-1 1) translate(${-cx} 0)` : undefined}
      style={reference.onTop ? { mixBlendMode: 'multiply' } : undefined}
      pointerEvents="none"
    />
  )
}

/** Pen tool: click to place points; click the first point (or press Enter) to close the shape. */
export function DrawLayer({ points, onAdd, onFinish }: { points: Pt[]; onAdd: (p: Pt) => void; onFinish: () => void }) {
  const [cursor, setCursor] = useState<Pt | null>(null)
  const preview = cursor && points.length ? [...points, cursor] : points
  return (
    <g>
      <rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onPointerMove={(e) => setCursor(svgPoint(e.currentTarget, e.clientX, e.clientY))}
        onPointerLeave={() => setCursor(null)}
        onClick={(e) => {
          e.stopPropagation()
          onAdd(svgPoint(e.currentTarget, e.clientX, e.clientY))
        }}
      />
      {points.length >= 2 && <path d={`${polyline(points)}Z`} fill={ACCENT} fillOpacity={0.15} pointerEvents="none" />}
      <path d={polyline(preview)} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="5 4" pointerEvents="none" />
      {points.map(([x, y], i) =>
        i === 0 ? (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={points.length >= 3 ? 9 : 6}
            fill={points.length >= 3 ? ACCENT : '#fff'}
            stroke={ACCENT}
            strokeWidth={2.5}
            style={{ cursor: points.length >= 3 ? 'pointer' : 'crosshair' }}
            onClick={(e) => {
              e.stopPropagation()
              if (points.length >= 3) onFinish()
            }}
          >
            <title>{points.length >= 3 ? 'Click to close the shape' : 'Start point'}</title>
          </circle>
        ) : (
          <circle key={i} cx={x} cy={y} r={5} fill="#fff" stroke={ACCENT} strokeWidth={2.5} pointerEvents="none" />
        ),
      )}
    </g>
  )
}

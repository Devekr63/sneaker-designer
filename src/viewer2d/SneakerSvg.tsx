import { useId, useMemo, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react'
import { contrastText } from '../domain/color'
import { isCustomId } from '../domain/parts'
import type { CustomPart, Design, PartId, PartStyle, SelectId } from '../domain/types'
import { buildGeometry, customPartPath, VIEW_H, VIEW_W, type Geometry } from './geometry'

const OUTLINE = 'rgba(20, 20, 24, 0.6)'
const ACCENT = '#FF5A36'
const FONT = "'Segoe UI', system-ui, -apple-system, sans-serif"
/** How far stitch lines sit inside a part's edge, px. */
const STITCH_INSET = 5

/** Built-in parts that are drawn as regions trimmed to the upper outline. */
const CLIPPED: PartId[] = ['quarter', 'heel_counter', 'vamp', 'toe_box', 'overlay', 'collar', 'eyestay']

interface Props {
  design: Pick<Design, 'parts' | 'shape' | 'customParts'>
  selected?: SelectId | null
  hovered?: SelectId | null
  onSelect?: (id: SelectId) => void
  onHover?: (id: SelectId | null) => void
  /** Custom parts select on pointer-down so they can be dragged in the same gesture. */
  onCustomPointerDown?: (id: string, e: PointerEvent<SVGGElement>) => void
  onCustomDoubleClick?: (id: string, e: MouseEvent<SVGGElement>) => void
  /** Editor-only layer (handles, rulers); stripped from exports. */
  overlay?: (geo: Geometry) => ReactNode
  /** Editor-only layer drawn behind the shoe (e.g. a reference sketch); stripped from exports. */
  underlay?: ReactNode
  svgRef?: Ref<SVGSVGElement>
  className?: string
  title?: string
}

/** Pseudo-random but stable dot layout for the midsole speckle. */
const SPECKLE_DOTS = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return { x: r(1) * 70, y: r(2) * 44, r: 0.8 + r(3) * 1.8, dark: r(4) > 0.45 }
})

export function SneakerSvg(props: Props) {
  const { design, selected, hovered, onSelect, onHover, onCustomPointerDown, onCustomDoubleClick, overlay, underlay, svgRef, className, title } =
    props
  const { parts, customParts } = design
  const geo = useMemo(() => buildGeometry(design.shape), [design.shape])

  // Prefix all <defs> ids so several sneakers (editor + gallery thumbnails) can share a page.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const ref = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${ref(name)})`
  const interactive = !!onSelect
  const upperClip = url('upper-clip')

  const textureFill = (style: PartStyle, isMidsole = false): { fill?: string; filter?: string } | null => {
    if (isMidsole) return style.speckle ? { fill: url('speckle') } : null
    switch (style.material) {
      case 'leather': return { fill: '#000', filter: url('grain') }
      case 'suede': return { fill: '#000', filter: url('suede') }
      case 'mesh': return { fill: url('mesh') }
      case 'knit': return { fill: url('knit') }
      case 'canvas': return { fill: url('canvas') }
      case 'patent': return { fill: url('gloss') }
      default: return null
    }
  }

  const hoverHandlers = (id: SelectId) =>
    interactive ? { onMouseEnter: () => onHover?.(id), onMouseLeave: () => onHover?.(null) } : {}

  const builtinHandlers = (id: PartId) =>
    interactive
      ? {
          ...hoverHandlers(id),
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            onSelect?.(id)
          },
          style: { cursor: 'pointer' },
        }
      : {}

  /**
   * Dashed stitch line STITCH_INSET px inside the edge of `d`. A mask keeps only a thin ring of the
   * (wide, dashed) stroke at that distance from the edge, and a self-clip keeps the inner half.
   */
  const stitching = (key: string, d: string, color: string) => {
    const outer = STITCH_INSET * 2 + 1.4
    const inner = STITCH_INSET * 2 - 1.4
    return (
      <g pointerEvents="none">
        <clipPath id={ref(`st-clip-${key}`)}>
          <path d={d} />
        </clipPath>
        <mask id={ref(`st-mask-${key}`)} maskUnits="userSpaceOnUse" x={-100} y={-100} width={VIEW_W + 200} height={VIEW_H + 200}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={outer} strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#000" strokeWidth={inner} strokeLinejoin="round" />
        </mask>
        <path
          d={d}
          fill="none"
          stroke={contrastText(color)}
          strokeOpacity={0.6}
          strokeWidth={outer}
          strokeDasharray="5 4"
          strokeLinejoin="round"
          mask={url(`st-mask-${key}`)}
          clipPath={url(`st-clip-${key}`)}
        />
      </g>
    )
  }

  /** Fill + texture + shading + stitching + outline for one closed shape. */
  const surface = (
    key: string,
    d: string,
    style: PartStyle,
    opts: { sole?: boolean; midsole?: boolean; translucent?: boolean } = {},
  ) => {
    const texture = textureFill(style, opts.midsole)
    return (
      <>
        <path d={d} fill={style.color} fillOpacity={opts.translucent ? 0.72 : 1} />
        {opts.translucent && <path d={d} fill={url('ice')} pointerEvents="none" />}
        {texture && <path d={d} fill={texture.fill} filter={texture.filter} pointerEvents="none" />}
        <path d={d} fill={url(opts.sole ? 'shade-sole' : 'shade')} pointerEvents="none" />
        {style.stitch && stitching(key, d, style.color)}
        <path d={d} fill="none" stroke={OUTLINE} strokeWidth={1.6} strokeLinejoin="round" pointerEvents="none" />
      </>
    )
  }

  const label = (anchor: { x: number; y: number; rotate: number; size: number } | undefined, style: PartStyle) =>
    anchor && style.text ? (
      <text
        x={anchor.x}
        y={anchor.y}
        transform={`rotate(${anchor.rotate} ${anchor.x} ${anchor.y})`}
        fontSize={anchor.size}
        fontFamily={FONT}
        fontWeight={800}
        letterSpacing={1.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={contrastText(style.color)}
        pointerEvents="none"
      >
        {style.text}
      </text>
    ) : null

  const builtin = (id: Exclude<PartId, 'laces'>) => {
    const style = parts[id]
    if (style.hidden) return null
    const isSole = id === 'midsole' || id === 'outsole'
    return (
      <g key={id} data-part={id} {...builtinHandlers(id)}>
        {surface(id, geo.paths[id], style, { sole: isSole, midsole: id === 'midsole', translucent: id === 'outsole' && style.translucent })}
        {id === 'outsole' && (
          <path d={geo.tread} stroke="rgba(0,0,0,0.28)" strokeWidth={4} clipPath={url('outsole-clip')} pointerEvents="none" />
        )}
        {id === 'eyestay' &&
          geo.eyelets.map(([x, y], i) => (
            <g key={i} pointerEvents="none">
              <circle cx={x} cy={y} r={5.2} fill="#D8D8D8" stroke={OUTLINE} strokeWidth={1} />
              <circle cx={x} cy={y} r={2.6} fill="#2A2A2A" />
            </g>
          ))}
        {id === 'tongue' && label(geo.text.tongue, style)}
        {id === 'heel_counter' && label(geo.text.heel_counter, style)}
      </g>
    )
  }

  const laces = () => {
    const style = parts.laces
    if (style.hidden) return null
    return (
      <g key="laces" data-part="laces" {...builtinHandlers('laces')}>
        {geo.laces.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={OUTLINE} strokeWidth={8.5} strokeLinecap="round" />
            <path d={d} fill="none" stroke={style.color} strokeWidth={6} strokeLinecap="round" />
            <path d={d} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeLinecap="round" transform="translate(-1 -1)" />
            {interactive && <path d={d} fill="none" stroke="transparent" strokeWidth={18} strokeLinecap="round" />}
          </g>
        ))}
      </g>
    )
  }

  const custom = (cp: CustomPart) => {
    const d = customPartPath(geo, cp)
    if (!d || cp.style.hidden) return null
    return (
      <g
        key={cp.id}
        data-part={cp.id}
        {...(interactive
          ? {
              ...hoverHandlers(cp.id),
              onPointerDown: (e: PointerEvent<SVGGElement>) => onCustomPointerDown?.(cp.id, e),
              onClick: (e: MouseEvent) => e.stopPropagation(),
              onDoubleClick: (e: MouseEvent<SVGGElement>) => onCustomDoubleClick?.(cp.id, e),
              style: { cursor: selected === cp.id ? 'move' : 'pointer' },
            }
          : {})}
      >
        {surface(cp.id, d, cp.style, { translucent: cp.style.translucent })}
      </g>
    )
  }

  /** Custom parts trimmed to the upper outline. */
  const clippedCustom = (onTop: boolean) => (
    <g clipPath={upperClip}>{customParts.filter((c) => c.onTop === onTop && c.clip).map(custom)}</g>
  )
  const freeCustom = (onTop: boolean) => customParts.filter((c) => c.onTop === onTop && !c.clip).map(custom)

  const highlight = (id: SelectId | null | undefined, strong: boolean) => {
    if (!id) return null
    let paths: string[]
    let clip = false
    if (isCustomId(id)) {
      const cp = customParts.find((c) => c.id === id)
      if (!cp) return null
      paths = [customPartPath(geo, cp)]
      clip = cp.clip
    } else if (id === 'laces') {
      paths = geo.laces
    } else {
      paths = [geo.paths[id as Exclude<PartId, 'laces'>]]
      clip = CLIPPED.includes(id as PartId)
    }
    const width = id === 'laces' ? 10 : 3
    return (
      <g key={`${id}-${strong}`} clipPath={clip ? upperClip : undefined} pointerEvents="none">
        {paths.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" opacity={strong ? 0.9 : 0.6} />
            <path
              d={d}
              fill="none"
              stroke={ACCENT}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={strong ? undefined : '6 5'}
              opacity={strong ? 1 : 0.8}
            />
          </g>
        ))}
      </g>
    )
  }

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      role="img"
      aria-label={title ?? 'Sneaker design'}
    >
      <defs>
        <filter id={ref('grain')} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0 0 0 -0.18" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id={ref('suede')} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="3" seed="8" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.32" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" />
        </filter>
        <pattern id={ref('mesh')} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="rgba(0,0,0,0.26)" />
          <circle cx="6" cy="6" r="1.6" fill="rgba(0,0,0,0.26)" />
          <circle cx="1.5" cy="1.5" r="0.7" fill="rgba(255,255,255,0.25)" />
          <circle cx="5.5" cy="5.5" r="0.7" fill="rgba(255,255,255,0.25)" />
        </pattern>
        <pattern id={ref('knit')} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 L3 0 L6 3" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.2" />
          <path d="M0 6 L3 3 L6 6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </pattern>
        <pattern id={ref('canvas')} width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 1 H4" stroke="rgba(0,0,0,0.11)" strokeWidth="1" />
          <path d="M1 0 V4" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        </pattern>
        <pattern id={ref('speckle')} width="70" height="44" patternUnits="userSpaceOnUse">
          {SPECKLE_DOTS.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.dark ? 'rgba(20,20,20,0.75)' : 'rgba(228,87,46,0.85)'} />
          ))}
        </pattern>
        <linearGradient id={ref('gloss')} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={ref('shade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={ref('shade-sole')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={ref('ice')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E6F7FF" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#E6F7FF" stopOpacity="0.1" />
          <stop offset="1" stopColor="#E6F7FF" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id={ref('shadow')}>
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ref('outsole-clip')}>
          <path d={geo.paths.outsole} />
        </clipPath>
        <clipPath id={ref('upper-clip')}>
          <path d={geo.upper} />
        </clipPath>
      </defs>

      {underlay && <g data-ui="true">{underlay}</g>}
      <ellipse cx={geo.shadow.cx} cy={geo.shadow.cy} rx={geo.shadow.rx} ry={18} fill={url('shadow')} />

      {builtin('tongue')}
      <g clipPath={upperClip}>
        {builtin('quarter')}
        {builtin('heel_counter')}
        {builtin('vamp')}
        {builtin('toe_box')}
        {builtin('overlay')}
      </g>
      {clippedCustom(false)}
      {builtin('heel_tab')}
      <g clipPath={upperClip}>
        {builtin('collar')}
        {builtin('eyestay')}
      </g>
      <path d={geo.upper} fill="none" stroke={OUTLINE} strokeWidth={1.8} strokeLinejoin="round" pointerEvents="none" />
      {freeCustom(false)}
      {laces()}
      {builtin('outsole')}
      {builtin('midsole')}
      {clippedCustom(true)}
      {freeCustom(true)}

      {interactive && (
        <g data-ui="true">
          {hovered !== selected && highlight(hovered, false)}
          {highlight(selected, true)}
          {overlay?.(geo)}
        </g>
      )}
    </svg>
  )
}

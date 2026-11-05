export type PartId =
  | 'toe_box'
  | 'vamp'
  | 'quarter'
  | 'overlay'
  | 'eyestay'
  | 'laces'
  | 'tongue'
  | 'collar'
  | 'heel_counter'
  | 'heel_tab'
  | 'midsole'
  | 'outsole'

export type MaterialId =
  | 'leather'
  | 'suede'
  | 'mesh'
  | 'knit'
  | 'canvas'
  | 'patent'
  | 'foam'
  | 'rubber'

export interface PartStyle {
  color: string
  material: MaterialId
  /** Short label printed on the part (tongue, heel). */
  text?: string
  /** Midsole only: paint-splatter speckle. */
  speckle?: boolean
  /** Outsole only: icy translucent rubber. */
  translucent?: boolean
  /** Optional built-in parts can be removed from the shoe. */
  hidden?: boolean
  /** Dashed stitch line just inside the part's edge. */
  stitch?: boolean
}

export type Parts = Record<PartId, PartStyle>

/**
 * A point in shoe space: `u` runs along the shoe from toe (0) to heel (1);
 * `h` is the height in px above the top of the midsole at that `u`; negative values
 * are a percentage of the sole's thickness (-100 = the ground).
 * Shape-relative coordinates keep anchors and custom parts attached when the
 * length or sole thickness changes.
 */
export interface UH {
  u: number
  h: number
}

/**
 * How much each curve of the outline bows, in px. Positive bulges outward
 * (away from the shoe), negative pulls inward. Sole curves bow upward.
 */
export interface Bends {
  /** Roundness of the toe. */
  toeRound: number
  /** Underside of the toe, between the sole and the nose. */
  toeUnder: number
  /** Top line from toe box to throat. */
  vamp: number
  /** The lacing line. */
  lacing: number
  /** Ankle opening, front half. */
  collarFront: number
  /** Ankle opening, back half. */
  collarBack: number
  /** Back of the heel. */
  heel: number
  /** Midsole top line at mid-foot (+ raises, − dips). */
  midsoleArch: number
  /** Heel lift on the bottom of the sole. */
  heelRocker: number
}

export type BendId = keyof Bends

export interface ShapeParams {
  /** Toe-to-heel length on the canvas, px. */
  length: number
  toeHeight: number
  toeTopU: number
  toeSpring: number
  /** Where the toe cap seam sits (u). */
  toeCap: number
  midsoleToe: number
  midsoleHeel: number
  outsole: number
  /** How far the heel bulges past the sole (u). */
  heelBulge: number
  /** Where the heel counter starts (u). */
  heelCounter: number
  tongueHeight: number
  eyelets: number
  throat: UH
  collarFront: UH
  collarDip: UH
  heelTop: UH
  bends: Bends
  /** Frontmost point of the upper: `u` reach (negative = further forward), `f` height as a fraction of the toe height. */
  toeNose: { u: number; f: number }
  /** Front tip of the sole: `u` reach, `f` height as a fraction of the sole thickness (0 = ground, 1 = top). */
  soleToe: { u: number; f: number }
  /** 0 = rounded/pointed sole tip, 1 = squared-off front. */
  soleToeBlunt: number
  /** Width of the padded collar band, px. */
  collarWidth: number
}

/** A custom-part point; `c` marks a sharp corner inside an otherwise smooth outline. */
export interface PartPoint extends UH {
  c?: boolean
}

export interface CustomPart {
  id: string
  name: string
  points: PartPoint[]
  /** Smooth curve through the points (except corner points), or straight edges throughout. */
  smooth: boolean
  /** Trim to the outline of the upper. */
  clip: boolean
  /** Paint above the laces and sole instead of on the upper. */
  onTop: boolean
  style: PartStyle
}

export interface Design {
  id: string
  name: string
  version: 2
  /** EU shoe size. */
  sizeEU: number
  shape: ShapeParams
  parts: Parts
  customParts: CustomPart[]
  createdAt: string
  updatedAt: string
}

export type PartOption = 'text' | 'speckle' | 'translucent'

export interface PartDef {
  id: PartId
  label: string
  description: string
  allowedMaterials: MaterialId[]
  options?: PartOption[]
  removable?: boolean
}

/** A built-in PartId or a custom part id (prefixed `cp_`). */
export type SelectId = string

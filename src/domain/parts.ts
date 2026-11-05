import type { MaterialId, PartDef, PartId } from './types'

export const UPPER_MATERIALS: MaterialId[] = ['leather', 'suede', 'mesh', 'knit', 'canvas', 'patent']
export const ALL_MATERIALS: MaterialId[] = [...UPPER_MATERIALS, 'foam', 'rubber']

/** Parts in the order shown in the editor (front of the shoe to the back, then the sole). */
export const PART_DEFS: PartDef[] = [
  { id: 'toe_box', label: 'Toe Box', description: 'Front cap that covers the toes.', allowedMaterials: UPPER_MATERIALS, removable: true },
  { id: 'vamp', label: 'Vamp', description: 'Top-front section over the foot.', allowedMaterials: UPPER_MATERIALS, removable: true },
  { id: 'quarter', label: 'Quarter', description: 'Main side panel of the upper.', allowedMaterials: UPPER_MATERIALS },
  { id: 'overlay', label: 'Side Stripe', description: 'Decorative overlay on the side panel.', allowedMaterials: UPPER_MATERIALS, removable: true },
  { id: 'eyestay', label: 'Eyestay', description: 'Panel holding the lace holes.', allowedMaterials: ['leather', 'suede', 'patent', 'canvas'] },
  { id: 'laces', label: 'Laces', description: 'Laces. Hide them for a slip-on look.', allowedMaterials: [], removable: true },
  { id: 'tongue', label: 'Tongue', description: 'Flap under the laces.', allowedMaterials: ['mesh', 'knit', 'leather', 'suede', 'canvas'], options: ['text'] },
  { id: 'collar', label: 'Collar', description: 'Padded opening around the ankle.', allowedMaterials: ['suede', 'leather', 'mesh', 'knit'], removable: true },
  { id: 'heel_counter', label: 'Heel Counter', description: 'Rear cup that stiffens the heel.', allowedMaterials: UPPER_MATERIALS, options: ['text'], removable: true },
  { id: 'heel_tab', label: 'Heel Tab', description: 'Pull tab at the top of the heel.', allowedMaterials: ['leather', 'suede', 'patent', 'canvas'], removable: true },
  { id: 'midsole', label: 'Midsole', description: 'Foam cushioning layer.', allowedMaterials: ['foam'], options: ['speckle'] },
  { id: 'outsole', label: 'Outsole', description: 'Ground-contact rubber with tread.', allowedMaterials: ['rubber'], options: ['translucent'] },
]

export const PART_BY_ID = Object.fromEntries(PART_DEFS.map((p) => [p.id, p])) as Record<PartId, PartDef>

export function isCustomId(id: string | null | undefined): boolean {
  return !!id && id.startsWith('cp_')
}

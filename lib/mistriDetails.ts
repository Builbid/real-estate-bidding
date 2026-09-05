// ============================================================
// Mistri Worker work requirements — stored as projects.mistri_details
// ============================================================

import type { BuildingType, ConstructionTypesMap, ConstructionTypeValue } from './buildingConfig';
import {
  isProjectStartDateNotInPast,
  PROJECT_START_DATE_PAST_INVALID_MESSAGE,
} from './projectStartTime';
import {
  ASSAM_BUILDING_TYPE,
  BUILDING_TYPE_OPTIONS,
  CONSTRUCTION_TYPE_FULL,
  CONSTRUCTION_TYPE_GROUND,
  CONSTRUCTION_TYPE_UPPER,
  RCC_BUILDING_TYPES,
} from './buildingConfig';

export type MistriCivilWorkType =
  | 'brickwork_aac'
  | 'plastering'
  | 'foundation_concrete_structure'
  | 'tile_marble_flooring'
  | 'boundary_wall_fencing'
  | 'complete_full_structure';

/** Legacy civil work values that may exist on older mistri_details rows. */
type LegacyMistriCivilWorkType = 'rcc_column_beam_slab' | 'foundation_pcc';

export type MistriPlasterSide = 'single' | 'both';

/** Wall material for Brickwork / AAC Block Work. */
export type MistriBrickworkMaterial = 'red_brick' | 'aac_block';

/** Plastering scope nested under brickwork or boundary wall (includes none). */
export type MistriWallPlasteringScope = 'single' | 'both' | 'none';

export type MistriBoundaryWallThickness = '5_inch' | '3_inch';

export type MistriBoundaryWallStructure = 'full_solid' | 'half_grill';

export interface MistriBrickworkDetails {
  materialType: MistriBrickworkMaterial;
  plasteringScope: MistriWallPlasteringScope;
}

export interface MistriBoundaryWallDetails {
  thickness: MistriBoundaryWallThickness;
  structureType: MistriBoundaryWallStructure;
  plasteringFinish: MistriWallPlasteringScope;
}

/** Preset / custom selector for current construction floors. */
export type MistriCurrentFloorOption = 'G+0' | 'G+1' | 'G+2' | 'custom';

/** Dropdown selector for future foundation expansion capacity. */
export type MistriFutureFloorOption =
  | 'same'
  | 'G+1'
  | 'G+2'
  | 'G+3'
  | 'G+4'
  | 'G+5'
  | 'custom';

/**
 * @deprecated Prefer MistriCurrentFloorOption / MistriFutureFloorOption.
 */
export type MistriStructuralFloorOption = MistriCurrentFloorOption | 'G+3';

/**
 * @deprecated Legacy single floor selector — still parsed from older mistri_details rows.
 * Prefer currentFloorPlan / futureFloorPlan.
 */
export type MistriFloorLevel = 'ground' | '1st' | '2nd' | 'custom';

export type MistriContractType =
  | 'labor_only'
  | 'labor_centering';

/** Legacy contract type no longer collected on the form. */
type LegacyMistriContractType = 'full_material_labor';

export type MistriStartTimeType = '1week' | '2week' | '1month' | 'specific';

/** Multi-select floors for brickwork / plastering work area. */
export type MistriWorkAreaFloor =
  | 'ground'
  | '1st'
  | '2nd'
  | 'custom';

/** Floor picker on the Mistri Project Info step (Assam XOR RCC / custom). */
export type MistriFloorId = BuildingType | 'custom';

export type MistriFloorWorkType =
  | 'full_finished'
  | 'frame_skeleton'
  | 'brick_aac'
  | 'plastering'
  | 'flooring';

/** RCC Scope of Work card: full construction, frame only, or wall + plaster. */
export type MistriRccScopeOption =
  | 'full_construction'
  | 'frame_only'
  | 'wall_plaster_only';

/** Top-level activity bucket on the Work Requirements step. */
export type MistriActivityCategory = 'major' | 'minor';

const MAJOR_FLOOR_WORK_TYPES: readonly MistriFloorWorkType[] = [
  'full_finished',
  'frame_skeleton',
];

const MINOR_FLOOR_WORK_TYPES: readonly MistriFloorWorkType[] = [
  'brick_aac',
  'plastering',
  'flooring',
];

export function isMajorFloorWorkType(value: MistriFloorWorkType): boolean {
  return (MAJOR_FLOOR_WORK_TYPES as readonly string[]).includes(value);
}

export function isMinorFloorWorkType(value: MistriFloorWorkType): boolean {
  return (MINOR_FLOOR_WORK_TYPES as readonly string[]).includes(value);
}

/** Infer category from current work types (null when nothing selected yet). */
export function getMistriActivityCategory(
  workTypes: readonly MistriFloorWorkType[],
): MistriActivityCategory | null {
  if (workTypes.some(isMajorFloorWorkType)) return 'major';
  if (workTypes.some(isMinorFloorWorkType)) return 'minor';
  return null;
}

/** Plaster scope nested under Brick/AAC or standalone plastering. */
export type MistriPlasterScope = 'both' | 'exterior' | 'interior';

export type MistriFlooringMaterial =
  | 'tile'
  | 'marble'
  | 'granite'
  | 'smooth_cement_finish';

/** Assam Type roof structure choice on Work Requirements. */
export type MistriAssamRoofType = 'steel_truss' | 'rcc_truss' | 'wood_truss';

/** Assam Type roofing sheet material. */
export type MistriAssamRoofingSheet =
  | 'basic_gi_tin'
  | 'colour_coated_metal'
  | 'upvc';

/** Per-floor work captured on new Mistri posts. */
export interface MistriFloorWork {
  floorId: MistriFloorId;
  /** Required when floorId === 'custom' (typically 5+). */
  customFloorNumber?: number | null;
  workTypes: MistriFloorWorkType[];
  brickMaterial?: MistriBrickworkMaterial | null;
  plasterScope?: MistriPlasterScope | null;
  flooringMaterial?: MistriFlooringMaterial | null;
  /**
   * When workTypes includes full_finished: whether the client also wants
   * Tile / Marble / Granite flooring (beyond rough flooring in the package).
   */
  includeFineFlooring?: boolean | null;
  /** Approximate flooring work area in sq. ft. when flooring work is included. */
  flooringAreaSqft?: number | null;
  /** Approximate wall area in sq. ft. when Option 3 (wall + plaster only) is selected. */
  wallAreaSqft?: number | null;
  /** RCC Scope of Work card: full construction, frame only, or wall + plaster. */
  scopeOption?: MistriRccScopeOption | null;
  /** Canonical scope sentence stored for the agreement PDF. */
  scopeLabel?: string | null;
  /** Assam Type only — Steel / RCC / Wood Truss. */
  assamRoofType?: MistriAssamRoofType | null;
  /** Assam Type only — roofing sheet material. */
  assamRoofingSheet?: MistriAssamRoofingSheet | null;
  /** Assam Type only — foundation depth in feet. */
  foundationDepthFt?: number | null;
  /** Slab area for this floor in sq. ft. Used for Mistri civil-cost bidding. */
  slabAreaSqft?: number | null;
}

export interface MistriDetails {
  /**
   * Per-floor work for new posts. When present and non-empty this is the source of truth.
   * Legacy rows omit this and use civilWorkTypes instead.
   */
  floorWork?: MistriFloorWork[] | null;
  /** Selected civil work type(s). New posts are single-select; legacy rows may include multiple. */
  civilWorkTypes: MistriCivilWorkType[];
  /** Required when civilWorkTypes includes plastering. */
  plasterSide?: MistriPlasterSide | null;
  /** Required on new posts when civilWorkTypes includes brickwork_aac. */
  brickworkDetails?: MistriBrickworkDetails | null;
  /** Required on new posts when civilWorkTypes includes boundary_wall_fencing. */
  boundaryWallDetails?: MistriBoundaryWallDetails | null;
  /** Approximate project area in sq.ft. (rough estimate is fine). */
  approximateAreaSqft: number;
  /**
   * Current construction floor plan — clean value e.g. "G+1", "G+2", "G+5".
   * Required when civil work includes full structure or foundation/concrete structure.
   */
  currentFloorPlan: string | null;
  /**
   * Future planned foundation capacity — clean value e.g. "G+1", "G+2", "G+5".
   * Must be ≥ currentFloorPlan when both are set.
   */
  futureFloorPlan: string | null;
  /**
   * Floors where brickwork / plastering work applies (multi-select).
   * Required on new posts when those work types are selected.
   */
  workAreaFloors?: MistriWorkAreaFloor[] | null;
  /** Free-text floors when workAreaFloors includes 'custom'. */
  workAreaCustomFloors?: string | null;
  /**
   * @deprecated Legacy single floor field. Kept for older rows; new posts use current/future.
   */
  floorLevel?: MistriFloorLevel | null;
  /** @deprecated Legacy custom floor count for floorLevel === 'custom'. */
  customFloorCount?: number | null;
  /** Required on new posts only for full structure / foundation & concrete structure. */
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType;
  /** ISO date YYYY-MM-DD when projectStartTimeType === 'specific' */
  projectStartTimeSpecificDate?: string | null;
  additionalRequirements?: string | null;
  /** Optional extra scope moved from the retired Carpenter service. */
  includeDoorWindowFrames?: boolean | null;
  /** Legacy only — new posts no longer collect a door/window count. */
  doorWindowFramesQuantity?: string | null;
}

export const MISTRI_CIVIL_WORK_OPTIONS: {
  value: MistriCivilWorkType;
  label: string;
}[] = [
  {
    value: 'complete_full_structure',
    label: 'Complete Full Structure (Foundation to Plastering)',
  },
  {
    value: 'foundation_concrete_structure',
    label: 'Foundation & Concrete Structure (PCC / RCC Column, Beam & Slab)',
  },
  { value: 'brickwork_aac', label: 'Brickwork / AAC Block Work' },
  { value: 'plastering', label: 'Plastering Work' },
  {
    value: 'tile_marble_flooring',
    label: 'Flooring Work (Tiles / Marble / Granites Work)',
  },
  { value: 'boundary_wall_fencing', label: 'Boundary Wall Work' },
];

export const MISTRI_CHOWKHAT_SECTION_LABEL = 'Door & Window Frames Work (Carpentry Add-on)';
export const MISTRI_CHOWKHAT_LABEL = 'Door & Window Frames Fitting (Chowkhat Work)';
export const MISTRI_CHOWKHAT_HINT =
  'Check this if you want the Mistri contractor to include carpenter work for door and window frame fitting.';
export const MISTRI_CHOWKHAT_RATE_NOTE =
  'Carpentry rates are calculated based on the total sqft frame area (not per unit door/window count).';

export const ASSAM_CIVIL_BID_LABEL = 'Civil Work';
export const ASSAM_ROOF_BID_LABEL = 'Roof Work';
export const ASSAM_TILE_BID_LABEL = 'Tile / Flooring Work';
export const ASSAM_CHOWKHAT_BID_LABEL = 'Door & Window Frames';

export function hasMistriChowkhat(
  details: Pick<MistriDetails, 'includeDoorWindowFrames' | 'doorWindowFramesQuantity'> | null | undefined,
): boolean {
  if (!details) return false;
  if (details.includeDoorWindowFrames === true) return true;
  return Boolean(details.doorWindowFramesQuantity?.trim());
}

export function hasAssamMistriFloorWork(
  details: Pick<MistriDetails, 'floorWork'> | null | undefined,
): boolean {
  return !!details?.floorWork?.some((fw) => isAssamMistriFloor(fw.floorId));
}

export function isAssamOnlyFloorWork(floorWork: readonly MistriFloorWork[]): boolean {
  return floorWork.length > 0 && floorWork.every((fw) => isAssamMistriFloor(fw.floorId));
}

export function hasAssamRoofWork(
  details: Pick<MistriDetails, 'floorWork'> | null | undefined,
): boolean {
  return !!details?.floorWork?.some(
    (fw) =>
      isAssamMistriFloor(fw.floorId) &&
      (fw.assamRoofType != null || fw.assamRoofingSheet != null),
  );
}

export function hasAssamTileFlooringWork(
  details: Pick<MistriDetails, 'floorWork'> | null | undefined,
): boolean {
  return !!details?.floorWork?.some(
    (fw) => isAssamMistriFloor(fw.floorId) && fw.includeFineFlooring === true,
  );
}

/** Client selected tile / marble / granite fitting as project scope. */
export function hasMistriTileFittingScope(
  details: Pick<MistriDetails, 'floorWork' | 'civilWorkTypes'> | null | undefined,
): boolean {
  if (!details) return false;
  if (details.civilWorkTypes?.includes('tile_marble_flooring')) return true;
  return !!details.floorWork?.some(
    (fw) => fw.includeFineFlooring === true || fw.workTypes.includes('flooring'),
  );
}

export function getAssamMistriBidLabels(
  details: Pick<MistriDetails, 'floorWork' | 'includeDoorWindowFrames' | 'doorWindowFramesQuantity'> | null | undefined,
): string[] {
  const labels = [ASSAM_CIVIL_BID_LABEL];
  if (hasAssamRoofWork(details)) labels.push(ASSAM_ROOF_BID_LABEL);
  if (hasAssamTileFlooringWork(details)) labels.push(ASSAM_TILE_BID_LABEL);
  if (hasMistriChowkhat(details)) labels.push(ASSAM_CHOWKHAT_BID_LABEL);
  return labels;
}

/**
 * Structural options historically grouped with Complete Full Structure.
 * Kept for legacy project rows that may still contain multi-select combinations.
 */
export const MISTRI_STRUCTURAL_CIVIL_WORK: readonly MistriCivilWorkType[] = [
  'brickwork_aac',
  'plastering',
  'foundation_concrete_structure',
  'boundary_wall_fencing',
] as const;

/** Civil work types that require structural floor planning (current + future). */
export const MISTRI_FLOOR_REQUIRED_CIVIL_WORK: readonly MistriCivilWorkType[] = [
  'complete_full_structure',
  'foundation_concrete_structure',
] as const;

/** The only civil work types that may render Contract Type. */
export const MISTRI_CONTRACT_TYPE_REQUIRED_CIVIL_WORK: readonly MistriCivilWorkType[] = [
  'complete_full_structure',
  'foundation_concrete_structure',
] as const;

/** Labels for the only options allowed to show the Contract Type section. */
export const ALLOWED_CONTRACT_TYPE_WORK_TYPES: readonly string[] = [
  'Complete Full Structure (Foundation to Plastering)',
  'Foundation & Concrete Structure (PCC / RCC Column, Beam & Slab)',
];

/** Civil work types that require work-area (floor) selection. */
export const MISTRI_WORK_AREA_REQUIRED_CIVIL_WORK: readonly MistriCivilWorkType[] = [
  'brickwork_aac',
  'plastering',
] as const;

/** True when floor plans must be selected for the given civil work types. */
export function mistriFloorLevelRequired(
  types: readonly MistriCivilWorkType[],
): boolean {
  return types.some((t) =>
    (MISTRI_FLOOR_REQUIRED_CIVIL_WORK as readonly string[]).includes(t),
  );
}

/** True when Contract Type may be shown / required for the given civil work types. */
export function mistriContractTypeRequired(
  types: readonly MistriCivilWorkType[],
): boolean {
  return types.some((t) => {
    const label =
      MISTRI_CIVIL_WORK_OPTIONS.find((o) => o.value === t)?.label ?? t;
    return (ALLOWED_CONTRACT_TYPE_WORK_TYPES as readonly string[]).includes(label);
  });
}

/** True when brickwork/plastering work-area floors must be selected. */
export function mistriWorkAreaRequired(
  types: readonly MistriCivilWorkType[],
): boolean {
  return types.some((t) =>
    (MISTRI_WORK_AREA_REQUIRED_CIVIL_WORK as readonly string[]).includes(t),
  );
}

export const MISTRI_FULL_STRUCTURE_NOTE =
  '* Note: Complete Full Structure includes ground-level concrete and structural work, but excludes fine finishing work such as fine plastering, tile, or marble laying.';

/** Deduplicate civil work types (legacy rows may still contain multiple). */
export function normalizeMistriCivilWorkSelection(
  types: readonly MistriCivilWorkType[],
): MistriCivilWorkType[] {
  const unique: MistriCivilWorkType[] = [];
  for (const t of types) {
    if (!unique.includes(t)) unique.push(t);
  }
  return unique;
}

/**
 * Toggle civil work as single-select:
 * - Clicking an unselected option selects only that option.
 * - Clicking the active option clears the selection.
 */
export function toggleMistriCivilWorkType(
  current: readonly MistriCivilWorkType[],
  value: MistriCivilWorkType,
): MistriCivilWorkType[] {
  if (current.includes(value)) return [];
  return [value];
}

export const MISTRI_PLASTER_SIDE_OPTIONS: {
  value: MistriPlasterSide;
  label: string;
}[] = [
  { value: 'single', label: 'Single Side Plaster' },
  { value: 'both', label: 'Both Side Plaster' },
];

export const MISTRI_BRICKWORK_MATERIAL_OPTIONS: {
  value: MistriBrickworkMaterial;
  label: string;
}[] = [
  { value: 'red_brick', label: 'Red Brick' },
  { value: 'aac_block', label: 'AAC Block' },
];

export const MISTRI_WALL_PLASTERING_SCOPE_OPTIONS: {
  value: MistriWallPlasteringScope;
  label: string;
}[] = [
  { value: 'single', label: 'Single Side Plastering' },
  { value: 'both', label: 'Both Sides Plastering' },
  { value: 'none', label: 'No Plastering Required' },
];

export const MISTRI_BOUNDARY_WALL_THICKNESS_OPTIONS: {
  value: MistriBoundaryWallThickness;
  label: string;
}[] = [
  { value: '5_inch', label: '5 Inch Wall' },
  { value: '3_inch', label: '3 Inch Wall' },
];

export const MISTRI_BOUNDARY_WALL_STRUCTURE_OPTIONS: {
  value: MistriBoundaryWallStructure;
  label: string;
}[] = [
  { value: 'full_solid', label: 'Full Solid Complete Wall' },
  { value: 'half_grill', label: 'Half Wall with Half Grill/Fencing Mounted' },
];

/** Current construction floor buttons (Box 1). */
export const MISTRI_CURRENT_FLOOR_OPTIONS: {
  value: MistriCurrentFloorOption;
  label: string;
}[] = [
  { value: 'G+0', label: 'Ground Floor Only' },
  { value: 'G+1', label: 'G+1 (Ground + 1 Floor)' },
  { value: 'G+2', label: 'G+2 (Ground + 2 Floors)' },
  { value: 'custom', label: 'Custom (Manual Entry)' },
];

/** Future foundation expansion dropdown options (Box 2). */
export const MISTRI_FUTURE_FLOOR_OPTIONS: {
  value: MistriFutureFloorOption;
  label: string;
}[] = [
  { value: 'same', label: 'Same as current build (minimum required)' },
  { value: 'G+1', label: 'G+1 (Ground + 1 Floor)' },
  { value: 'G+2', label: 'G+2 (Ground + 2 Floors)' },
  { value: 'G+3', label: 'G+3 (Ground + 3 Floors)' },
  { value: 'G+4', label: 'G+4 (Ground + 4 Floors)' },
  { value: 'G+5', label: 'G+5 (Ground + 5 Floors)' },
  { value: 'custom', label: 'Custom Number (Enter Manually)' },
];

/**
 * @deprecated Prefer MISTRI_CURRENT_FLOOR_OPTIONS / MISTRI_FUTURE_FLOOR_OPTIONS.
 */
export const MISTRI_STRUCTURAL_FLOOR_OPTIONS: {
  value: MistriStructuralFloorOption;
  label: string;
}[] = [
  { value: 'G+0', label: 'Ground Floor Only' },
  { value: 'G+1', label: 'G+1 (Ground + 1 Floor)' },
  { value: 'G+2', label: 'G+2 (Ground + 2 Floors)' },
  { value: 'G+3', label: 'G+3 (Ground + 3 Floors)' },
  { value: 'custom', label: 'Custom (Manual Entry)' },
];

/** @deprecated Use MISTRI_STRUCTURAL_FLOOR_OPTIONS. */
export const MISTRI_FLOOR_LEVEL_OPTIONS: {
  value: MistriFloorLevel;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: '1st', label: '1st Floor' },
  { value: '2nd', label: '2nd Floor' },
  { value: 'custom', label: '3+ Floors (Specify Exact)' },
];

/** Multi-select work-area floors for brickwork / plastering. */
export const MISTRI_WORK_AREA_FLOOR_OPTIONS: {
  value: MistriWorkAreaFloor;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: '1st', label: '1st Floor' },
  { value: '2nd', label: '2nd Floor' },
  { value: 'custom', label: 'Custom Floor(s)' },
];

export const MISTRI_CONTRACT_TYPE_OPTIONS: {
  value: MistriContractType;
  label: string;
}[] = [
  { value: 'labor_only', label: 'Mistri Rate Only' },
  { value: 'labor_centering', label: 'Mistri Rate + Shuttering' },
];

const LEGACY_CIVIL_WORK_MAP: Record<LegacyMistriCivilWorkType, MistriCivilWorkType> = {
  rcc_column_beam_slab: 'foundation_concrete_structure',
  foundation_pcc: 'foundation_concrete_structure',
};

const LEGACY_CONTRACT_MAP: Record<LegacyMistriContractType, MistriContractType> = {
  full_material_labor: 'labor_centering',
};

export const MISTRI_START_TIME_OPTIONS: {
  value: MistriStartTimeType;
  label: string;
}[] = [
  { value: '1week', label: 'Within one week' },
  { value: '2week', label: 'Within two week' },
  { value: '1month', label: 'Within 1 month' },
  { value: 'specific', label: 'Specific Date' },
];

export const MISTRI_CUSTOM_FLOOR_ID = 'custom' as const;

export const MIN_CUSTOM_RCC_FLOOR = 5;
export const MAX_CUSTOM_RCC_FLOOR = 50;

export const MISTRI_ACTIVITY_CATEGORY_OPTIONS: {
  value: MistriActivityCategory;
  label: string;
  description: string;
  note: string;
}[] = [
  {
    value: 'major',
    label: 'Major activities',
    description: '1. Full Finished Structure  ·  2. Frame (Slab) only',
    note: 'Full Finished Structure includes: foundation for ground floor, column, beam, slab, Brick/AAC wall, plastering, rough flooring, staircase, etc. Frame (Slab) only is structure without wall finishing.',
  },
  {
    value: 'minor',
    label: 'Minor activities',
    description: '1. Brick wall work  ·  2. Plastering  ·  3. Flooring',
    note: 'Add-on finishing work such as walls, plaster, and tiles — not the building\'s structural frame.',
  },
];

export const MISTRI_YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const MISTRI_ASSAM_ROOF_OPTIONS: {
  value: MistriAssamRoofType;
  label: string;
}[] = [
  { value: 'steel_truss', label: 'Steel Truss' },
  { value: 'rcc_truss', label: 'RCC Truss' },
  { value: 'wood_truss', label: 'Wood Truss' },
];

export const MISTRI_ASSAM_ROOFING_SHEET_OPTIONS: {
  value: MistriAssamRoofingSheet;
  label: string;
}[] = [
  { value: 'basic_gi_tin', label: 'Basic GI Tin sheet' },
  {
    value: 'colour_coated_metal',
    label: 'Colour Coated Metal Profile Sheet (e.g. Tata Durashine, Jindal, JSW)',
  },
  { value: 'upvc', label: 'UPVC Roof Sheet' },
];

export const MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS: {
  value: MistriFlooringMaterial;
  label: string;
}[] = [
  { value: 'tile', label: 'Tile' },
  { value: 'marble', label: 'Marble' },
  { value: 'smooth_cement_finish', label: 'Smooth Cement Finish' },
];

export const MISTRI_RCC_FLOOR_WORK_OPTIONS: {
  value: MistriFloorWorkType;
  label: string;
  category: MistriActivityCategory;
}[] = [
  { value: 'full_finished', label: 'Full Finished Structure', category: 'major' },
  { value: 'frame_skeleton', label: 'Frame (Slab) only', category: 'major' },
  { value: 'brick_aac', label: 'Brick / AAC wall', category: 'minor' },
  { value: 'plastering', label: 'Plastering work', category: 'minor' },
  {
    value: 'flooring',
    label: 'Flooring work (Tile / Marble / Granite)',
    category: 'minor',
  },
];

/** Structured RCC Scope of Work (replaces Major / Minor activity buckets). */
export const UPPER_FLOOR_WALL_REQUIRES_EXISTING_GF_STRUCTURE =
  'Upper floor wall construction (Option 3) requires an existing ground floor structure.';

export const STRUCTURAL_FRAMING_CONTINUITY_MESSAGE =
  'New structural framing (Option 1/2) requires structural continuity from lower floors.';

export const UPPER_FLOOR_STRUCTURAL_REQUIRES_LOWER_FRAME =
  'Requires structural frame on the floor below.';

export const UPPER_FLOOR_WALL_LOCKED_BY_LOWER_STRUCTURE =
  'Option 3 (Wall Construction Only) is unavailable because lower floors require new structural framing. You must select Option 1 or Option 2 to cast the slab/frame first.';

export const OPTION_3_REQUIRES_EXISTING_SLAB =
  'Option 3 requires an existing structural slab on this floor from prior construction.';

export const MISTRI_RCC_SCOPE_OPTIONS: {
  value: MistriRccScopeOption;
  optionNumber: 1 | 2 | 3;
  title: string;
}[] = [
  { value: 'full_construction', optionNumber: 1, title: 'Full Construction' },
  { value: 'frame_only', optionNumber: 2, title: 'Frame / Slab Casting Only' },
  { value: 'wall_plaster_only', optionNumber: 3, title: 'Wall Construction & Plastering Only' },
];

export function getMistriRccScopeTitle(
  workTypes: readonly MistriFloorWorkType[] = [],
  stored?: MistriRccScopeOption | null,
): string | null {
  const option = rccScopeFromWorkTypes(workTypes, stored);
  if (!option) return null;
  return MISTRI_RCC_SCOPE_OPTIONS.find((entry) => entry.value === option)?.title ?? null;
}

export function isRccGroundMistriFloor(floorId: MistriFloorId): boolean {
  return floorId === 'RCC Ground Floor';
}

export function getMistriRccScopeLabel(
  floorId: MistriFloorId,
  option: MistriRccScopeOption,
): string {
  const ground = isRccGroundMistriFloor(floorId);
  switch (option) {
    case 'full_construction':
      return ground
        ? 'Full Construction (Foundation, beam, column, slab, wall and plastering, rough flooring, staircase)'
        : 'Full Construction (Beam, column, slab, wall and plastering, rough flooring, staircase)';
    case 'frame_only':
      return ground
        ? 'Frame / Slab Casting Only (Foundation, column, beam, staircase, slab casting). No Wall construction.'
        : 'Frame / Slab Casting Only (Column, beam, staircase, slab casting). No Wall construction.';
    case 'wall_plaster_only':
      return 'Wall Construction & Plastering Only (Brick / AAC Block)';
  }
}

export function workTypesFromRccScope(option: MistriRccScopeOption): MistriFloorWorkType[] {
  switch (option) {
    case 'full_construction':
      return ['full_finished'];
    case 'frame_only':
      return ['frame_skeleton'];
    case 'wall_plaster_only':
      return ['brick_aac', 'plastering'];
  }
}

export function rccScopeFromWorkTypes(
  workTypes: readonly MistriFloorWorkType[],
  stored?: MistriRccScopeOption | null,
): MistriRccScopeOption | null {
  if (stored === 'full_construction' || stored === 'frame_only' || stored === 'wall_plaster_only') {
    return stored;
  }
  if (workTypes.includes('full_finished')) return 'full_construction';
  if (workTypes.includes('frame_skeleton')) return 'frame_only';
  if (workTypes.includes('brick_aac') || workTypes.includes('plastering')) {
    return 'wall_plaster_only';
  }
  return null;
}

export function isMistriWallPlasterOnlyFloor(
  fw: Pick<MistriFloorWork, 'workTypes' | 'scopeOption'>,
): boolean {
  return rccScopeFromWorkTypes(fw.workTypes, fw.scopeOption) === 'wall_plaster_only';
}

export function formatMistriRccScopeDescription(
  floorId: MistriFloorId,
  option: MistriRccScopeOption,
  includeTileFitting: boolean,
  brickMaterial?: MistriBrickworkMaterial | null,
  flooringMaterial?: MistriFlooringMaterial | null,
): string {
  let label = getMistriRccScopeLabel(floorId, option);
  if (option === 'wall_plaster_only' && brickMaterial) {
    label = `${label} — ${optionLabel(MISTRI_BRICKWORK_MATERIAL_OPTIONS, brickMaterial)}`;
  }
  if (option === 'full_construction' && includeTileFitting) {
    const material = flooringMaterial
      ? optionLabel(MISTRI_FLOORING_MATERIAL_OPTIONS, flooringMaterial)
      : null;
    return material
      ? `${label} + Flooring Work (${material})`
      : `${label} + Flooring Work`;
  }
  return label;
}

export function isStructuralRccScope(scope: MistriRccScopeOption | null | undefined): boolean {
  return scope === 'full_construction' || scope === 'frame_only';
}

export function groundFloorStructureIsNewBuild(
  floorWork: readonly Pick<MistriFloorWork, 'floorId' | 'workTypes' | 'scopeOption'>[],
): boolean {
  const gf = floorWork.find((fw) => isRccGroundMistriFloor(fw.floorId));
  if (!gf) return false;
  const scope = rccScopeFromWorkTypes(gf.workTypes, gf.scopeOption);
  return isStructuralRccScope(scope);
}

type MistriScopeFloor = Pick<
  MistriFloorWork,
  'floorId' | 'customFloorNumber' | 'workTypes' | 'scopeOption'
>;

function findScopeFloorAtLevel(
  floorWork: readonly MistriScopeFloor[],
  level: number,
): MistriScopeFloor | undefined {
  return floorWork.find(
    (fw) =>
      !isAssamMistriFloor(fw.floorId) &&
      mistriFloorUpperCount(fw.floorId, fw.customFloorNumber) === level,
  );
}

function selectedRccFloorLevels(floorWork: readonly MistriScopeFloor[]): number[] {
  return floorWork
    .filter((fw) => !isAssamMistriFloor(fw.floorId))
    .map((fw) => mistriFloorUpperCount(fw.floorId, fw.customFloorNumber))
    .sort((a, b) => a - b);
}

/**
 * A floor level has a structural frame when Option 1/2 is selected on it,
 * Option 3 is selected (existing slab), or the level sits below the lowest
 * selected floor (Structure Already Built Previously).
 */
export function floorLevelHasStructuralFrame(
  level: number,
  floorWork: readonly MistriScopeFloor[],
): boolean {
  const atLevel = findScopeFloorAtLevel(floorWork, level);
  if (atLevel) {
    const scope = rccScopeFromWorkTypes(atLevel.workTypes, atLevel.scopeOption);
    if (isStructuralRccScope(scope)) return true;
    if (scope === 'wall_plaster_only') return true;
    return false;
  }
  const selectedLevels = selectedRccFloorLevels(floorWork);
  if (selectedLevels.length === 0) return false;
  return level < selectedLevels[0];
}

/**
 * Option 1/2 on upper floor N requires a structural frame on floor N-1
 * (new framing, wall-only on existing slab, or prior construction below).
 */
export function isUpperFloorStructuralScopeBlocked(
  floorId: MistriFloorId,
  floorWork: readonly MistriScopeFloor[],
  customFloorNumber?: number | null,
): boolean {
  if (isAssamMistriFloor(floorId)) return false;
  const level = mistriFloorUpperCount(floorId, customFloorNumber);
  if (level <= 0) return false;
  return !floorLevelHasStructuralFrame(level - 1, floorWork);
}

/**
 * Option 3 requires the slab for this floor to already exist from prior construction.
 */
export function floorSlabExistsFromPriorConstruction(
  level: number,
  floorWork: readonly MistriScopeFloor[],
): boolean {
  const atLevel = findScopeFloorAtLevel(floorWork, level);
  if (atLevel) {
    const scope = rccScopeFromWorkTypes(atLevel.workTypes, atLevel.scopeOption);
    if (isStructuralRccScope(scope)) return false;
  }
  const firstNewStructure = firstNewStructureFloorLevel(floorWork);
  if (firstNewStructure == null) return true;
  return level < firstNewStructure;
}

/** Option 3 is blocked when lower floors need new framing or this slab does not pre-exist. */
export function isWallPlasterScopeBlocked(
  floorId: MistriFloorId,
  floorWork: readonly MistriScopeFloor[],
  customFloorNumber?: number | null,
): boolean {
  if (isAssamMistriFloor(floorId)) return false;
  const level = mistriFloorUpperCount(floorId, customFloorNumber);
  if (isUpperFloorWallScopeBlocked(floorId, floorWork, customFloorNumber)) return true;
  return !floorSlabExistsFromPriorConstruction(level, floorWork);
}

export function structuralFramingLevels(floorWork: readonly MistriScopeFloor[]): number[] {
  const levels: number[] = [];
  for (const fw of floorWork) {
    if (isAssamMistriFloor(fw.floorId)) continue;
    const scope = rccScopeFromWorkTypes(fw.workTypes, fw.scopeOption);
    if (!isStructuralRccScope(scope)) continue;
    levels.push(mistriFloorUpperCount(fw.floorId, fw.customFloorNumber));
  }
  return [...new Set(levels)].sort((a, b) => a - b);
}

/**
 * Lowest selected floor that uses Option 1 (Full Construction) or
 * Option 2 (Frame / Slab Casting Only). Floors above this boundary cannot
 * use Option 3 because the new frame/slab must be cast first.
 */
export function firstNewStructureFloorLevel(
  floorWork: readonly MistriScopeFloor[],
): number | null {
  const levels = structuralFramingLevels(floorWork);
  return levels.length > 0 ? levels[0] : null;
}

/**
 * Option 3 is locked on every floor above the lowest Option 1/2 floor.
 * Floors at or below that boundary may still use wall-only work
 * (existing shell below new framing).
 */
export function isUpperFloorWallScopeBlocked(
  floorId: MistriFloorId,
  floorWork: readonly MistriScopeFloor[],
  customFloorNumber?: number | null,
): boolean {
  if (isAssamMistriFloor(floorId)) return false;
  const firstNewStructure = firstNewStructureFloorLevel(floorWork);
  if (firstNewStructure == null) return false;
  return mistriFloorUpperCount(floorId, customFloorNumber) > firstNewStructure;
}

export function hasStructuralFramingDiscontinuity(
  floorWork: readonly MistriScopeFloor[],
): boolean {
  return !areMistriFloorUppersContiguous(structuralFramingLevels(floorWork));
}

/** Highest floor in the unbroken Option 1/2 run starting at the lowest structural floor. */
export function structuralFramingContinuityEnd(
  floorWork: readonly MistriScopeFloor[],
): number | null {
  const levels = structuralFramingLevels(floorWork);
  if (levels.length === 0) return null;
  let end = levels[0];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] === end + 1) end = levels[i];
    else break;
  }
  return end;
}

/**
 * True when this floor uses Option 1/2 and sits above a gap in new concrete
 * (e.g. 2nd + 4th frame without 3rd). The lowest structural floor is allowed
 * to start from an existing shell.
 */
export function isStructuralFramingDisconnected(
  floorId: MistriFloorId,
  customFloorNumber: number | null | undefined,
  floorWork: readonly MistriScopeFloor[],
): boolean {
  if (isAssamMistriFloor(floorId)) return false;
  const levels = structuralFramingLevels(floorWork);
  if (areMistriFloorUppersContiguous(levels)) return false;
  const end = structuralFramingContinuityEnd(floorWork);
  if (end == null) return false;
  const level = mistriFloorUpperCount(floorId, customFloorNumber);
  return levels.includes(level) && level > end;
}

export const MISTRI_ASSAM_FLOOR_WORK_OPTIONS: {
  value: MistriFloorWorkType;
  label: string;
  category: MistriActivityCategory;
}[] = [
  {
    value: 'full_finished',
    label: 'Full finishing upto Plastering and Roof work',
    category: 'major',
  },
];

export const MISTRI_PLASTER_SCOPE_OPTIONS: {
  value: MistriPlasterScope;
  label: string;
}[] = [
  { value: 'both', label: 'Both side plaster' },
  { value: 'exterior', label: 'Exterior plaster' },
  { value: 'interior', label: 'Interior plaster' },
];

export const MISTRI_FLOORING_MATERIAL_OPTIONS: {
  value: MistriFlooringMaterial;
  label: string;
}[] = [
  { value: 'tile', label: 'Tiles' },
  { value: 'marble', label: 'Marble' },
  { value: 'granite', label: 'Granite' },
];

export const CUSTOM_FLOOR_NUMBER_INVALID_MESSAGE =
  'Enter a custom floor number from 5 to 50.';

export const CUSTOM_FLOOR_SEQUENCE_INVALID_MESSAGE =
  'Enter consecutive floor numbers from 5–50 (e.g. 7,8,9). Gaps or out-of-order values are invalid.';

export const CUSTOM_FLOOR_SEQUENCE_AFTER_4TH_INVALID_MESSAGE =
  'With RCC 4th Floor selected, custom floors must be a consecutive sequence starting at 5 (e.g. 5,6,7).';

export const CUSTOM_FLOOR_NUMBERS_INVALID_MESSAGE =
  'Enter floor numbers from 5 to 50, separated by commas (e.g. 7,9,12).';

export function getCustomFloorSequenceInvalidMessage(
  requireStartAt5: boolean,
  allowGaps = false,
): string {
  if (allowGaps) return CUSTOM_FLOOR_NUMBERS_INVALID_MESSAGE;
  return requireStartAt5
    ? CUSTOM_FLOOR_SEQUENCE_AFTER_4TH_INVALID_MESSAGE
    : CUSTOM_FLOOR_SEQUENCE_INVALID_MESSAGE;
}

export const CUSTOM_FLOOR_PLAN_INVALID_MESSAGE =
  'Please enter an accurate floor plan value.';

export const FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE =
  'Enter foundation provision as a whole number of floors (digits only).';

export const FOUNDATION_CAPACITY_INVALID_MESSAGE =
  'Foundation provision must be greater than your highest constructing floor (e.g. building up to 4th floor → enter 5 or higher).';

export const MAJOR_FLOOR_SEQUENCE_INVALID_MESSAGE =
  'For major activities, selected floors must be consecutive with no gaps. Ground + 3rd is invalid without 1st and 2nd. Selecting only 3rd + 4th is fine for an existing building.';

const CIVIL_WORK_SET = new Set<string>(MISTRI_CIVIL_WORK_OPTIONS.map((o) => o.value));
const CURRENT_FLOOR_OPTION_SET = new Set<string>(
  MISTRI_CURRENT_FLOOR_OPTIONS.map((o) => o.value),
);
const FUTURE_FLOOR_OPTION_SET = new Set<string>(
  MISTRI_FUTURE_FLOOR_OPTIONS.map((o) => o.value),
);
const LEGACY_FLOOR_SET = new Set<string>(MISTRI_FLOOR_LEVEL_OPTIONS.map((o) => o.value));
const WORK_AREA_FLOOR_SET = new Set<string>(
  MISTRI_WORK_AREA_FLOOR_OPTIONS.map((o) => o.value),
);
const CONTRACT_SET = new Set<string>(MISTRI_CONTRACT_TYPE_OPTIONS.map((o) => o.value));
const PLASTER_SIDE_SET = new Set<string>(MISTRI_PLASTER_SIDE_OPTIONS.map((o) => o.value));
const BRICKWORK_MATERIAL_SET = new Set<string>(
  MISTRI_BRICKWORK_MATERIAL_OPTIONS.map((o) => o.value),
);
const WALL_PLASTERING_SCOPE_SET = new Set<string>(
  MISTRI_WALL_PLASTERING_SCOPE_OPTIONS.map((o) => o.value),
);
const BOUNDARY_WALL_THICKNESS_SET = new Set<string>(
  MISTRI_BOUNDARY_WALL_THICKNESS_OPTIONS.map((o) => o.value),
);
const BOUNDARY_WALL_STRUCTURE_SET = new Set<string>(
  MISTRI_BOUNDARY_WALL_STRUCTURE_OPTIONS.map((o) => o.value),
);
const START_TIME_TYPES = new Set<MistriStartTimeType>([
  '1week',
  '2week',
  '1month',
  'specific',
]);
const BUILDING_TYPE_SET = new Set<string>(BUILDING_TYPE_OPTIONS);
const FLOOR_WORK_TYPE_SET = new Set<string>(
  MISTRI_RCC_FLOOR_WORK_OPTIONS.map((o) => o.value),
);
const PLASTER_SCOPE_SET = new Set<string>(
  MISTRI_PLASTER_SCOPE_OPTIONS.map((o) => o.value),
);
const FLOORING_MATERIAL_SET = new Set<string>(
  MISTRI_FLOORING_MATERIAL_OPTIONS.map((o) => o.value),
);
const ASSAM_ROOF_SET = new Set<string>(MISTRI_ASSAM_ROOF_OPTIONS.map((o) => o.value));
const ASSAM_ROOFING_SHEET_SET = new Set<string>(
  MISTRI_ASSAM_ROOFING_SHEET_OPTIONS.map((o) => o.value),
);
const ASSAM_FLOORING_MATERIAL_SET = new Set<string>(
  MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS.map((o) => o.value),
);

const RCC_FLOOR_UPPER: Record<string, number> = {
  'RCC Ground Floor': 0,
  'RCC 1st Floor': 1,
  'RCC 2nd Floor': 2,
  'RCC 3rd Floor': 3,
  'RCC 4th Floor': 4,
};

const MIN_UPPER_FLOORS = 0;
const MAX_UPPER_FLOORS = 50;
const MIN_LEGACY_CUSTOM_FLOORS = 3;
const MAX_LEGACY_CUSTOM_FLOORS = 50;

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function normalizeCivilWorkType(value: unknown): MistriCivilWorkType | null {
  if (typeof value !== 'string') return null;
  if (CIVIL_WORK_SET.has(value)) return value as MistriCivilWorkType;
  if (value in LEGACY_CIVIL_WORK_MAP) {
    return LEGACY_CIVIL_WORK_MAP[value as LegacyMistriCivilWorkType];
  }
  return null;
}

function normalizeContractType(value: unknown): MistriContractType | null {
  if (typeof value !== 'string') return null;
  if (CONTRACT_SET.has(value)) return value as MistriContractType;
  if (value in LEGACY_CONTRACT_MAP) {
    return LEGACY_CONTRACT_MAP[value as LegacyMistriContractType];
  }
  return null;
}

const CONTRACT_TYPE_FALLBACK_LABEL = 'Mistri Rate Only';

const LEGACY_CONTRACT_LABEL_MAP: Record<string, MistriContractType> = {
  'labor rate only': 'labor_only',
  'mistri rate only': 'labor_only',
  'labor + shuttering': 'labor_centering',
  'mistri rate + shuttering': 'labor_centering',
};

/** Human-readable work scope for bid / project spec grids and agreements. */
export function formatMistriContractTypeLabel(value: unknown): string {
  const normalized = normalizeContractType(value);
  if (normalized) return optionLabel(MISTRI_CONTRACT_TYPE_OPTIONS, normalized);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const legacy = LEGACY_CONTRACT_LABEL_MAP[trimmed.toLowerCase()];
    if (legacy) return optionLabel(MISTRI_CONTRACT_TYPE_OPTIONS, legacy);
    const byLabel = MISTRI_CONTRACT_TYPE_OPTIONS.find(
      (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (byLabel) return byLabel.label;
  }
  return CONTRACT_TYPE_FALLBACK_LABEL;
}

function normalizeLegacyFloorLevel(value: unknown): MistriFloorLevel | null {
  if (typeof value !== 'string') return null;
  if (LEGACY_FLOOR_SET.has(value)) return value as MistriFloorLevel;
  if (value === '3rd_above') return 'custom';
  return null;
}

function normalizePlasterSide(value: unknown): MistriPlasterSide | null {
  if (typeof value !== 'string') return null;
  if (PLASTER_SIDE_SET.has(value)) return value as MistriPlasterSide;
  return null;
}

function normalizeBrickworkMaterial(value: unknown): MistriBrickworkMaterial | null {
  if (typeof value !== 'string') return null;
  if (BRICKWORK_MATERIAL_SET.has(value)) return value as MistriBrickworkMaterial;
  return null;
}

function normalizeWallPlasteringScope(value: unknown): MistriWallPlasteringScope | null {
  if (typeof value !== 'string') return null;
  if (WALL_PLASTERING_SCOPE_SET.has(value)) return value as MistriWallPlasteringScope;
  return null;
}

function normalizeBoundaryWallThickness(
  value: unknown,
): MistriBoundaryWallThickness | null {
  if (typeof value !== 'string') return null;
  if (BOUNDARY_WALL_THICKNESS_SET.has(value)) return value as MistriBoundaryWallThickness;
  return null;
}

function normalizeBoundaryWallStructure(
  value: unknown,
): MistriBoundaryWallStructure | null {
  if (typeof value !== 'string') return null;
  if (BOUNDARY_WALL_STRUCTURE_SET.has(value)) {
    return value as MistriBoundaryWallStructure;
  }
  return null;
}

export function normalizeBrickworkDetails(raw: unknown): MistriBrickworkDetails | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const materialType = normalizeBrickworkMaterial(v.materialType);
  const plasteringScope = normalizeWallPlasteringScope(v.plasteringScope);
  if (!materialType || !plasteringScope) return null;
  return { materialType, plasteringScope };
}

export function normalizeBoundaryWallDetails(
  raw: unknown,
): MistriBoundaryWallDetails | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const thickness = normalizeBoundaryWallThickness(v.thickness);
  const structureType = normalizeBoundaryWallStructure(v.structureType);
  const plasteringFinish = normalizeWallPlasteringScope(v.plasteringFinish);
  if (!thickness || !structureType || !plasteringFinish) return null;
  return { thickness, structureType, plasteringFinish };
}

function normalizeWorkAreaFloor(value: unknown): MistriWorkAreaFloor | null {
  if (typeof value !== 'string') return null;
  if (WORK_AREA_FLOOR_SET.has(value)) return value as MistriWorkAreaFloor;
  return null;
}

/** Normalize multi-select work-area floors; returns null when empty / invalid. */
export function normalizeWorkAreaFloors(raw: unknown): MistriWorkAreaFloor[] | null {
  if (!Array.isArray(raw)) return null;
  const normalized: MistriWorkAreaFloor[] = [];
  for (const item of raw) {
    const next = normalizeWorkAreaFloor(item);
    if (next && !normalized.includes(next)) normalized.push(next);
  }
  return normalized.length > 0 ? normalized : null;
}

export function formatMistriWorkAreaFloors(
  floors: readonly MistriWorkAreaFloor[] | null | undefined,
  custom?: string | null,
): string {
  if (!floors || floors.length === 0) return '—';
  const parts = floors.map((f) => {
    if (f === 'custom') {
      const text = custom?.trim();
      return text ? `Custom (${text})` : 'Custom Floor(s)';
    }
    return optionLabel(MISTRI_WORK_AREA_FLOOR_OPTIONS, f);
  });
  return parts.join(', ');
}

/**
 * Normalize a floor-plan string to clean "G+N" form.
 * Accepts "G+4", "g+5", plain upper-floor counts ("5"), or ground-only labels.
 */
export function normalizeFloorPlanValue(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const trimmed = String(raw).trim().toUpperCase();
  if (!trimmed) return null;

  if (
    trimmed === 'G' ||
    trimmed === 'G ONLY' ||
    trimmed === 'G+0' ||
    trimmed === 'GROUND' ||
    trimmed === 'GROUND FLOOR' ||
    trimmed === 'GROUND FLOOR ONLY' ||
    trimmed === 'SINGLE STORY' ||
    trimmed === 'SINGLE STOREY'
  ) {
    return 'G+0';
  }

  const gPlus = trimmed.match(/^G\+(\d+)$/);
  if (gPlus) {
    const n = parseInt(gPlus[1], 10);
    if (n >= MIN_UPPER_FLOORS && n <= MAX_UPPER_FLOORS) return `G+${n}`;
    return null;
  }

  // Plain count, optionally with trailing "+" (e.g. "8+").
  const digits = trimmed.match(/^(\d+)\+?$/);
  if (digits) {
    const n = parseInt(digits[1], 10);
    if (n >= MIN_UPPER_FLOORS && n <= MAX_UPPER_FLOORS) return `G+${n}`;
  }

  return null;
}

/** Upper-floor count from a clean "G+N" value (e.g. G+2 → 2, G+0 → 0). */
export function floorPlanUpperCount(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = normalizeFloorPlanValue(value);
  if (!normalized) return null;
  const match = normalized.match(/^G\+(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/** Resolve current-construction selection into a clean stored floor-plan value. */
export function resolveCurrentFloorPlan(
  option: MistriCurrentFloorOption | null,
  customValue: string | number,
): { value: string } | { error: string } {
  if (!option || !CURRENT_FLOOR_OPTION_SET.has(option)) {
    return { error: 'Select a floor plan option.' };
  }
  if (option === 'custom') {
    const normalized = normalizeFloorPlanValue(customValue);
    if (!normalized) {
      return { error: CUSTOM_FLOOR_PLAN_INVALID_MESSAGE };
    }
    return { value: normalized };
  }
  return { value: option };
}

/**
 * Resolve future-expansion dropdown selection.
 * `same` copies the already-resolved current floor plan.
 * Custom = whole-number floor count (G+N upper floors), digits only.
 */
export function resolveFutureFloorPlan(
  option: MistriFutureFloorOption | null,
  customValue: string | number,
  currentFloorPlan: string,
): { value: string } | { error: string } {
  if (!option || !FUTURE_FLOOR_OPTION_SET.has(option)) {
    return { error: 'Select a floor plan option.' };
  }
  if (option === 'same') {
    return { value: currentFloorPlan };
  }
  if (option === 'custom') {
    const n = parseFoundationCustomFloorCount(customValue);
    if (n == null) {
      return { error: FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE };
    }
    return { value: `G+${n}` };
  }
  return { value: option };
}

/**
 * Whole-number floor count for custom foundation provision (stored as G+N).
 * Digits only — no "+", letters, or decimals.
 */
export function parseFoundationCustomFloorCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value >= MIN_UPPER_FLOORS && value <= MAX_UPPER_FLOORS) return value;
    return null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (n < MIN_UPPER_FLOORS || n > MAX_UPPER_FLOORS) return null;
  return n;
}

/**
 * @deprecated Prefer resolveCurrentFloorPlan / resolveFutureFloorPlan.
 */
export function resolveStructuralFloorPlan(
  option: MistriStructuralFloorOption | null,
  customValue: string | number,
): { value: string } | { error: string } {
  if (!option) return { error: 'Select a floor plan option.' };
  if (option === 'G+3') return { value: 'G+3' };
  return resolveCurrentFloorPlan(option as MistriCurrentFloorOption, customValue);
}

/** True when a future dropdown preset is allowed given the current build floors. */
export function isFutureFloorOptionAllowed(
  option: MistriFutureFloorOption,
  currentUpper: number | null,
): boolean {
  if (option === 'same' || option === 'custom') return true;
  if (currentUpper == null) return true;
  const optionUpper = floorPlanUpperCount(option);
  return optionUpper != null && optionUpper >= currentUpper;
}

/** Infer which selector option matches a stored floor-plan value. */
export function structuralFloorOptionFromValue(
  value: string | null | undefined,
): MistriCurrentFloorOption | null {
  if (!value) return null;
  const normalized = normalizeFloorPlanValue(value);
  if (!normalized) return null;
  if (normalized === 'G+0' || normalized === 'G+1' || normalized === 'G+2') {
    return normalized;
  }
  return 'custom';
}

function legacyFloorToPlan(
  floorLevel: MistriFloorLevel,
  customFloorCount: number | null,
): string {
  switch (floorLevel) {
    case 'ground':
      return 'G+0';
    case '1st':
      return 'G+1';
    case '2nd':
      return 'G+2';
    case 'custom': {
      const total = customFloorCount ?? 3;
      // Legacy custom stored total floors; G+(total-1) upper floors.
      const upper = Math.max(0, Math.min(total - 1, MAX_UPPER_FLOORS));
      return `G+${upper}`;
    }
    default:
      return 'G+1';
  }
}

function normalizeLegacyCustomFloorCount(
  floorLevel: MistriFloorLevel,
  raw: unknown,
  legacyFloor?: unknown,
): number | null {
  if (floorLevel !== 'custom') return null;
  if (
    typeof raw === 'number' &&
    Number.isInteger(raw) &&
    raw >= MIN_LEGACY_CUSTOM_FLOORS
  ) {
    return Math.min(raw, MAX_LEGACY_CUSTOM_FLOORS);
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10);
    if (n >= MIN_LEGACY_CUSTOM_FLOORS) return Math.min(n, MAX_LEGACY_CUSTOM_FLOORS);
  }
  if (legacyFloor === '3rd_above') return 3;
  return null;
}

function normalizeCivilWorkTypes(raw: unknown): MistriCivilWorkType[] {
  if (!Array.isArray(raw)) return [];
  const normalized: MistriCivilWorkType[] = [];
  for (const item of raw) {
    const next = normalizeCivilWorkType(item);
    if (next && !normalized.includes(next)) normalized.push(next);
  }
  return normalizeMistriCivilWorkSelection(normalized);
}

/** Parse approximate area from free-text or number (e.g. "Approx. 1200 Sq. Ft."). */
export function parseApproximateAreaSqft(input: string | number): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? input : null;
  }
  const match = String(input).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const area = parseFloat(match[1]);
  return Number.isFinite(area) && area > 0 ? area : null;
}

function extractFloorPlans(raw: Record<string, unknown>): {
  currentFloorPlan: string | null;
  futureFloorPlan: string | null;
  floorLevel: MistriFloorLevel | null;
  customFloorCount: number | null;
} {
  let currentFloorPlan = normalizeFloorPlanValue(raw.currentFloorPlan);
  let futureFloorPlan = normalizeFloorPlanValue(raw.futureFloorPlan);

  const floorLevel = normalizeLegacyFloorLevel(raw.floorLevel);
  const customFloorCount = floorLevel
    ? normalizeLegacyCustomFloorCount(floorLevel, raw.customFloorCount, raw.floorLevel)
    : null;

  // Migrate legacy single floorLevel → dual plans when new fields absent.
  if ((!currentFloorPlan || !futureFloorPlan) && floorLevel) {
    const migrated = legacyFloorToPlan(
      floorLevel,
      customFloorCount ?? (floorLevel === 'custom' ? 3 : null),
    );
    if (!currentFloorPlan) currentFloorPlan = migrated;
    if (!futureFloorPlan) futureFloorPlan = migrated;
  }

  return { currentFloorPlan, futureFloorPlan, floorLevel, customFloorCount };
}

export function isAssamMistriFloor(floorId: MistriFloorId): boolean {
  return floorId === ASSAM_BUILDING_TYPE;
}

export function ordinalFloorSuffix(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

export function formatRccNthFloorLabel(n: number): string {
  if (n <= 0) return 'RCC Ground Floor';
  return `RCC ${n}${ordinalFloorSuffix(n)} Floor`;
}

export function parseCustomFloorNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    if (raw >= MIN_CUSTOM_RCC_FLOOR && raw <= MAX_CUSTOM_RCC_FLOOR) return raw;
    return null;
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10);
    if (n >= MIN_CUSTOM_RCC_FLOOR && n <= MAX_CUSTOM_RCC_FLOOR) return n;
  }
  return null;
}

/**
 * Comma-separated floors above 4th (5–50).
 * Default: consecutive ascending. When `requireStartAt5` is true, the sequence
 * must start at 5. When `allowGaps` is true (Mistri), any unique 5–50 mix is
 * allowed (e.g. 7,9,12) so existing shells can skip storeys.
 */
export function parseCustomFloorSequence(
  raw: unknown,
  options?: { requireStartAt5?: boolean; allowGaps?: boolean },
): number[] | null {
  const allowGaps = options?.allowGaps === true;
  const requireStartAt5 = options?.requireStartAt5 === true && !allowGaps;

  if (typeof raw === 'number' && Number.isInteger(raw)) {
    const single = parseCustomFloorNumber(raw);
    if (single == null) return null;
    if (requireStartAt5 && single !== MIN_CUSTOM_RCC_FLOOR) return null;
    return [single];
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;

  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n < MIN_CUSTOM_RCC_FLOOR || n > MAX_CUSTOM_RCC_FLOOR) return null;
    nums.push(n);
  }

  if (allowGaps) {
    if (new Set(nums).size !== nums.length) return null;
    return [...nums].sort((a, b) => a - b);
  }

  if (requireStartAt5 && nums[0] !== MIN_CUSTOM_RCC_FLOOR) return null;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) return null;
  }
  return nums;
}

export function mistriFloorUpperCount(
  floorId: MistriFloorId,
  customFloorNumber?: number | null,
): number {
  if (floorId === ASSAM_BUILDING_TYPE) return 0;
  if (floorId === MISTRI_CUSTOM_FLOOR_ID) {
    return customFloorNumber ?? MIN_CUSTOM_RCC_FLOOR;
  }
  return RCC_FLOOR_UPPER[floorId] ?? 0;
}

/** Upper-storey indexes for selected RCC floors (Ground=0 … 4th=4, custom=N…). Assam excluded. */
export function collectMistriFloorUpperLevels(input: {
  buildingTypes: readonly BuildingType[];
  customSelected?: boolean;
  customFloorNumber?: string | number | null;
}): number[] {
  const levels: number[] = [];
  for (const type of input.buildingTypes) {
    if (type === ASSAM_BUILDING_TYPE) continue;
    const upper = RCC_FLOOR_UPPER[type];
    if (typeof upper === 'number') levels.push(upper);
  }
  if (input.customSelected) {
    const requireStartAt5 = input.buildingTypes.includes('RCC 4th Floor');
    const sequence = parseCustomFloorSequence(input.customFloorNumber, {
      requireStartAt5,
    });
    if (sequence) levels.push(...sequence);
  }
  return [...new Set(levels)].sort((a, b) => a - b);
}

/** True when floors form one unbroken run (e.g. 3–4 OK; 0+3 not OK). */
export function areMistriFloorUppersContiguous(levels: readonly number[]): boolean {
  if (levels.length <= 1) return true;
  const sorted = [...levels].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Whether toggling `nextLevel` on/off keeps a contiguous major-work selection.
 * Empty → any single floor is allowed (existing-building start at 3rd, etc.).
 */
export function canToggleMistriFloorUpper(
  currentLevels: readonly number[],
  nextLevel: number,
): boolean {
  const set = new Set(currentLevels);
  if (set.has(nextLevel)) {
    set.delete(nextLevel);
  } else {
    set.add(nextLevel);
  }
  return areMistriFloorUppersContiguous([...set]);
}

export function validateMajorMistriFloorSequence(input: {
  buildingTypes: readonly BuildingType[];
  customSelected?: boolean;
  customFloorNumber?: string | number | null;
}): string | null {
  const levels = collectMistriFloorUpperLevels(input);
  if (!areMistriFloorUppersContiguous(levels)) {
    return MAJOR_FLOOR_SEQUENCE_INVALID_MESSAGE;
  }
  return null;
}

export function highestSelectedFloorUpper(floorWork: readonly MistriFloorWork[]): number {
  if (floorWork.length === 0) return 0;
  return Math.max(
    ...floorWork.map((fw) => mistriFloorUpperCount(fw.floorId, fw.customFloorNumber)),
  );
}

export function currentFloorPlanFromFloorWork(
  floorWork: readonly MistriFloorWork[],
): string {
  return `G+${highestSelectedFloorUpper(floorWork)}`;
}

export function formatMistriFloorWorkLabel(
  floor: Pick<MistriFloorWork, 'floorId' | 'customFloorNumber'>,
): string {
  if (floor.floorId === MISTRI_CUSTOM_FLOOR_ID) {
    const n = floor.customFloorNumber;
    return n != null ? formatRccNthFloorLabel(n) : 'Custom Floor';
  }
  return floor.floorId;
}

export function sortMistriFloorWork<T extends Pick<MistriFloorWork, 'floorId' | 'customFloorNumber'>>(
  floors: readonly T[],
): T[] {
  return [...floors].sort((a, b) => {
    if (a.floorId === ASSAM_BUILDING_TYPE) return -1;
    if (b.floorId === ASSAM_BUILDING_TYPE) return 1;
    return (
      mistriFloorUpperCount(a.floorId, a.customFloorNumber) -
      mistriFloorUpperCount(b.floorId, b.customFloorNumber)
    );
  });
}

export function floorWorkOptionsForFloor(
  floorId: MistriFloorId,
): { value: MistriFloorWorkType; label: string; category: MistriActivityCategory }[] {
  return isAssamMistriFloor(floorId)
    ? MISTRI_ASSAM_FLOOR_WORK_OPTIONS
    : MISTRI_RCC_FLOOR_WORK_OPTIONS;
}

export function floorWorkOptionsForCategory(
  floorId: MistriFloorId,
  category: MistriActivityCategory,
): { value: MistriFloorWorkType; label: string; category: MistriActivityCategory }[] {
  return floorWorkOptionsForFloor(floorId).filter((o) => o.category === category);
}

/**
 * Major: Full finished ↔ Frame (slab) are mutually exclusive (single select).
 * Minor: brick, plastering, and flooring may all be combined (multi-select).
 */
export function applyMistriFloorWorkSelection(
  current: readonly MistriFloorWorkType[],
  next: MistriFloorWorkType,
): MistriFloorWorkType[] {
  if (current.includes(next)) {
    return current.filter((t) => t !== next);
  }
  if (next === 'full_finished' || next === 'frame_skeleton') {
    return [next];
  }
  if (next === 'brick_aac' || next === 'plastering' || next === 'flooring') {
    const minor = current.filter(
      (t) => t === 'brick_aac' || t === 'plastering' || t === 'flooring',
    );
    return [...minor, next];
  }
  return [next];
}

/**
 * Work-type cards shown after Major/Minor is chosen.
 * Always lists the full category set; mutex is enforced on select.
 */
export function visibleMistriFloorWorkTypes(
  current: readonly MistriFloorWorkType[],
  floorId: MistriFloorId,
  category?: MistriActivityCategory | null,
): MistriFloorWorkType[] {
  const active = category ?? getMistriActivityCategory(current);
  if (!active) return [];
  return floorWorkOptionsForCategory(floorId, active).map((o) => o.value);
}

export function getMistriFullFinishedIncludes(floorId: MistriFloorId): string {
  if (isAssamMistriFloor(floorId)) {
    return 'Full finishing Assam Type work upto Plastering and Roof work (foundation, frame, walls, plaster, and roof).';
  }
  if (floorId === 'RCC Ground Floor') {
    return 'Includes: foundation for ground floor, column, beam, slab, Brick/AAC wall, plastering, rough flooring, staircase, etc.';
  }
  return 'Includes: column, beam, slab, Brick/AAC wall, plastering, rough flooring, staircase, etc.';
}

export function getMistriFrameSkeletonIncludes(floorId: MistriFloorId): string {
  if (floorId === 'RCC Ground Floor' || floorId === ASSAM_BUILDING_TYPE) {
    return 'Includes Foundation work, column, beam and slab (frame / slab only).';
  }
  return 'Includes column, beam and slab (frame / slab only).';
}

/**
 * Foundation provision is only asked when RCC Ground Floor is in scope with
 * major work (full finished / frame). Upper-floor-only posts skip it.
 * Assam Type uses foundationDepthFt instead.
 */
export function mistriFoundationProvisionRequired(
  floorWork: readonly MistriFloorWork[],
): boolean {
  return floorWork.some((fw) => {
    if (fw.floorId !== 'RCC Ground Floor') return false;
    return (
      fw.workTypes.includes('full_finished') ||
      fw.workTypes.includes('frame_skeleton')
    );
  });
}

export function isAssamFloorWork(fw: Pick<MistriFloorWork, 'floorId'>): boolean {
  return isAssamMistriFloor(fw.floorId);
}

export function mistriContractTypeRequiredForFloorWork(
  floorWork: readonly MistriFloorWork[],
): boolean {
  return floorWork.some(
    (fw) =>
      !isAssamMistriFloor(fw.floorId) &&
      (fw.workTypes.includes('full_finished') ||
        fw.workTypes.includes('frame_skeleton')),
  );
}

export function formatMistriFloorWorkTypes(
  workTypes: readonly MistriFloorWorkType[],
  extras?: {
    floorId?: MistriFloorId;
    brickMaterial?: MistriBrickworkMaterial | null;
    plasterScope?: MistriPlasterScope | null;
    flooringMaterial?: MistriFlooringMaterial | null;
    includeFineFlooring?: boolean | null;
    flooringAreaSqft?: number | null;
    wallAreaSqft?: number | null;
    scopeLabel?: string | null;
    assamRoofType?: MistriAssamRoofType | null;
    assamRoofingSheet?: MistriAssamRoofingSheet | null;
    foundationDepthFt?: number | null;
  },
): string {
  if (extras?.scopeLabel?.trim()) {
    return extras.scopeLabel.trim();
  }
  const isAssam = extras?.floorId ? isAssamMistriFloor(extras.floorId) : false;
  const flooringOptions = isAssam
    ? MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS
    : MISTRI_FLOORING_MATERIAL_OPTIONS;

  const labels = workTypes
    .map((t) => {
    if (t === 'full_finished') {
      const base = isAssam
        ? 'Full finishing upto Plastering and Roof work'
        : extras?.floorId
          ? getMistriRccScopeLabel(extras.floorId, 'full_construction')
          : 'Full Construction (Beam, column, slab, wall and plastering, rough flooring, staircase)';
      if (extras?.includeFineFlooring) {
        const area =
          extras.flooringAreaSqft && extras.flooringAreaSqft > 0
            ? ` · ${formatMistriArea(extras.flooringAreaSqft)} flooring`
            : '';
        if (extras.flooringMaterial) {
          const material = optionLabel(flooringOptions, extras.flooringMaterial);
          return `${base} + Flooring Work (${material})${area}`;
        }
        return `${base} + Flooring Work${area}`;
      }
      if (extras?.includeFineFlooring === false) {
        return isAssam ? `${base} (no fine flooring)` : base;
      }
      return base;
    }
    if (t === 'frame_skeleton') {
      return extras?.floorId
        ? getMistriRccScopeLabel(extras.floorId, 'frame_only')
        : 'Frame / Slab Casting Only (Column, beam, staircase, slab casting). No Wall construction.';
    }
    if (t === 'brick_aac' || t === 'plastering') {
      if (t === 'plastering' && workTypes.includes('brick_aac')) return null;
      let wall = extras?.floorId
        ? getMistriRccScopeLabel(extras.floorId, 'wall_plaster_only')
        : 'Wall Construction & Plastering Only (Brick / AAC Block)';
      if (extras?.brickMaterial) {
        wall = `${wall} — ${optionLabel(MISTRI_BRICKWORK_MATERIAL_OPTIONS, extras.brickMaterial)}`;
      }
      if (extras?.wallAreaSqft && extras.wallAreaSqft > 0) {
        wall = `${wall} · ${formatMistriArea(extras.wallAreaSqft)} wall`;
      }
      return wall;
    }
    if (t === 'flooring') {
      const material = extras?.flooringMaterial
        ? optionLabel(MISTRI_FLOORING_MATERIAL_OPTIONS, extras.flooringMaterial)
        : null;
      const area =
        extras?.flooringAreaSqft && extras.flooringAreaSqft > 0
          ? ` · ${formatMistriArea(extras.flooringAreaSqft)}`
          : '';
      return material
        ? `Flooring (${material})${area}`
        : `Flooring work (Tile / Marble / Granite)${area}`;
    }
    return t;
  })
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) return '—';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} + ${labels[1]}`;
  return labels.join(' + ');
}

export function civilWorkTypesFromFloorWork(
  floorWork: readonly MistriFloorWork[],
): MistriCivilWorkType[] {
  const types: MistriCivilWorkType[] = [];
  const add = (t: MistriCivilWorkType) => {
    if (!types.includes(t)) types.push(t);
  };
  for (const fw of floorWork) {
    if (fw.workTypes.includes('full_finished')) {
      add('complete_full_structure');
      if (fw.includeFineFlooring) add('tile_marble_flooring');
    }
    if (fw.workTypes.includes('frame_skeleton')) add('foundation_concrete_structure');
    if (fw.workTypes.includes('brick_aac')) add('brickwork_aac');
    if (fw.workTypes.includes('plastering')) add('plastering');
    if (fw.workTypes.includes('flooring')) add('tile_marble_flooring');
  }
  return types;
}

export function summarizeMistriFloorWorkScope(
  floorWork: readonly MistriFloorWork[],
): string {
  const ordered = sortMistriFloorWork(floorWork);
  if (ordered.length === 0) return '';
  const parts = ordered.map((fw) => {
    const floor = formatMistriFloorWorkLabel(fw);
    const work = formatMistriFloorWorkTypes(fw.workTypes, fw);
    return `${floor} — ${work}`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}; ${parts[1]}`;
  return `${parts[0]} + ${parts.length - 1} more floors`;
}

function normalizeMistriFloorId(value: unknown): MistriFloorId | null {
  if (typeof value !== 'string') return null;
  if (value === MISTRI_CUSTOM_FLOOR_ID) return MISTRI_CUSTOM_FLOOR_ID;
  if (BUILDING_TYPE_SET.has(value)) return value as BuildingType;
  return null;
}

function normalizeFloorWorkType(value: unknown): MistriFloorWorkType | null {
  if (typeof value !== 'string') return null;
  if (FLOOR_WORK_TYPE_SET.has(value)) return value as MistriFloorWorkType;
  return null;
}

function normalizeRccScopeOption(value: unknown): MistriRccScopeOption | null {
  if (value === 'full_construction' || value === 'frame_only' || value === 'wall_plaster_only') {
    return value;
  }
  return null;
}

function normalizePlasterScope(value: unknown): MistriPlasterScope | null {
  if (typeof value !== 'string') return null;
  if (PLASTER_SCOPE_SET.has(value)) return value as MistriPlasterScope;
  return null;
}

function normalizeFlooringMaterial(value: unknown): MistriFlooringMaterial | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  if (key === 'tile' || key === 'tiles') return 'tile';
  if (key === 'marble') return 'marble';
  if (key === 'granite') return 'granite';
  if (FLOORING_MATERIAL_SET.has(value)) return value as MistriFlooringMaterial;
  return null;
}

function normalizeAssamRoofType(value: unknown): MistriAssamRoofType | null {
  if (typeof value !== 'string') return null;
  if (ASSAM_ROOF_SET.has(value)) return value as MistriAssamRoofType;
  return null;
}

function normalizeAssamRoofingSheet(value: unknown): MistriAssamRoofingSheet | null {
  if (typeof value !== 'string') return null;
  if (ASSAM_ROOFING_SHEET_SET.has(value)) return value as MistriAssamRoofingSheet;
  return null;
}

function normalizeAssamFlooringMaterial(value: unknown): MistriFlooringMaterial | null {
  if (typeof value !== 'string') return null;
  if (value === 'cement_finish') return 'smooth_cement_finish';
  if (ASSAM_FLOORING_MATERIAL_SET.has(value)) return value as MistriFlooringMaterial;
  return null;
}

/** Positive foundation depth in feet (Assam Type). */
export function parseFoundationDepthFt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

function normalizeSingleFloorWork(raw: unknown): MistriFloorWork | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const floorId = normalizeMistriFloorId(v.floorId);
  if (!floorId) return null;

  const customFloorNumber =
    floorId === MISTRI_CUSTOM_FLOOR_ID ? parseCustomFloorNumber(v.customFloorNumber) : null;
  if (floorId === MISTRI_CUSTOM_FLOOR_ID && customFloorNumber == null) return null;

  if (!Array.isArray(v.workTypes) || v.workTypes.length === 0) return null;
  const workTypes: MistriFloorWorkType[] = [];
  for (const item of v.workTypes) {
    const next = normalizeFloorWorkType(item);
    if (next && !workTypes.includes(next)) workTypes.push(next);
  }
  if (workTypes.length === 0) return null;

  const exclusiveCount = [
    workTypes.includes('full_finished'),
    workTypes.includes('frame_skeleton'),
    workTypes.includes('brick_aac') ||
      workTypes.includes('plastering') ||
      workTypes.includes('flooring'),
  ].filter(Boolean).length;
  if (exclusiveCount > 1) return null;

  let brickMaterial: MistriBrickworkMaterial | null = null;
  if (workTypes.includes('brick_aac')) {
    brickMaterial = normalizeBrickworkMaterial(v.brickMaterial);
    if (!brickMaterial) return null;
  }

  let plasterScope: MistriPlasterScope | null = null;
  if (workTypes.includes('plastering')) {
    plasterScope = normalizePlasterScope(v.plasterScope);
    if (!plasterScope) return null;
  }

  let flooringMaterial: MistriFlooringMaterial | null = null;
  let includeFineFlooring: boolean | null = null;

  if (workTypes.includes('flooring')) {
    flooringMaterial = normalizeFlooringMaterial(v.flooringMaterial);
    if (!flooringMaterial) return null;
  } else if (workTypes.includes('full_finished')) {
    if (v.includeFineFlooring === true) {
      includeFineFlooring = true;
      flooringMaterial = isAssamMistriFloor(floorId)
        ? normalizeAssamFlooringMaterial(v.flooringMaterial)
        : normalizeFlooringMaterial(v.flooringMaterial);
      if (!flooringMaterial) return null;
    } else if (v.includeFineFlooring === false) {
      includeFineFlooring = false;
    }
    // Legacy full_finished rows may omit includeFineFlooring — keep null.
  }

  let assamRoofType: MistriAssamRoofType | null = null;
  let assamRoofingSheet: MistriAssamRoofingSheet | null = null;
  let foundationDepthFt: number | null = null;
  if (isAssamMistriFloor(floorId)) {
    assamRoofType = normalizeAssamRoofType(v.assamRoofType);
    assamRoofingSheet = normalizeAssamRoofingSheet(v.assamRoofingSheet);
    foundationDepthFt = parseFoundationDepthFt(v.foundationDepthFt);
  }

  const slabAreaSqft =
    typeof v.slabAreaSqft === 'number' || typeof v.slabAreaSqft === 'string'
      ? parseApproximateAreaSqft(v.slabAreaSqft)
      : null;

  const flooringAreaRaw = v.flooringAreaSqft ?? v.flooring_area_sqft;
  const flooringAreaSqft =
    includeFineFlooring === true || workTypes.includes('flooring')
      ? typeof flooringAreaRaw === 'number' || typeof flooringAreaRaw === 'string'
        ? parseApproximateAreaSqft(flooringAreaRaw)
        : null
      : null;

  const scopeOption = rccScopeFromWorkTypes(workTypes, normalizeRccScopeOption(v.scopeOption));
  const wallAreaRaw = v.wallAreaSqft ?? v.wall_area_sqft;
  const wallAreaSqft =
    scopeOption === 'wall_plaster_only'
      ? typeof wallAreaRaw === 'number' || typeof wallAreaRaw === 'string'
        ? parseApproximateAreaSqft(wallAreaRaw)
        : null
      : null;
  const includeTile = includeFineFlooring === true;
  const scopeLabel =
    typeof v.scopeLabel === 'string' && v.scopeLabel.trim()
      ? v.scopeLabel.trim()
      : scopeOption && !isAssamMistriFloor(floorId)
        ? formatMistriRccScopeDescription(
            floorId,
            scopeOption,
            includeTile,
            brickMaterial,
            flooringMaterial,
          )
        : null;

  return {
    floorId,
    customFloorNumber,
    workTypes,
    brickMaterial,
    plasterScope,
    flooringMaterial,
    includeFineFlooring,
    flooringAreaSqft,
    wallAreaSqft,
    scopeOption,
    scopeLabel,
    assamRoofType,
    assamRoofingSheet,
    foundationDepthFt,
    slabAreaSqft,
  };
}

export function normalizeMistriFloorWork(raw: unknown): MistriFloorWork[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const floors: MistriFloorWork[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const next = normalizeSingleFloorWork(item);
    if (!next) return null;
    const key =
      next.floorId === MISTRI_CUSTOM_FLOOR_ID
        ? `custom:${next.customFloorNumber}`
        : next.floorId;
    if (seen.has(key)) return null;
    seen.add(key);
    floors.push(next);
  }
  const hasAssam = floors.some((f) => isAssamMistriFloor(f.floorId));
  const hasRcc = floors.some((f) => !isAssamMistriFloor(f.floorId));
  if (hasAssam && hasRcc) return null;
  return sortMistriFloorWork(floors);
}

function mappedCustomBuildingType(customFloorNumber: number): BuildingType {
  if (customFloorNumber <= 0) return 'RCC Ground Floor';
  if (customFloorNumber === 1) return 'RCC 1st Floor';
  if (customFloorNumber === 2) return 'RCC 2nd Floor';
  if (customFloorNumber === 3) return 'RCC 3rd Floor';
  return 'RCC 4th Floor';
}

export function buildingTypesFromFloorWork(
  floorWork: readonly MistriFloorWork[],
): BuildingType[] {
  const types: BuildingType[] = [];
  for (const fw of floorWork) {
    let next: BuildingType;
    if (fw.floorId === MISTRI_CUSTOM_FLOOR_ID) {
      next = mappedCustomBuildingType(fw.customFloorNumber ?? MIN_CUSTOM_RCC_FLOOR);
    } else {
      next = fw.floorId;
    }
    if (!types.includes(next)) types.push(next);
  }
  return types.length > 0 ? types : ['RCC Ground Floor'];
}

function constructionTypeFromFloorWork(
  buildingType: BuildingType,
  fw: MistriFloorWork | undefined,
): ConstructionTypeValue {
  if (fw?.workTypes.includes('full_finished')) return CONSTRUCTION_TYPE_FULL;
  if (buildingType === ASSAM_BUILDING_TYPE || buildingType === 'RCC Ground Floor') {
    return CONSTRUCTION_TYPE_GROUND;
  }
  return CONSTRUCTION_TYPE_UPPER;
}

function plasterSideFromScope(scope: MistriPlasterScope | null | undefined): MistriPlasterSide | null {
  if (!scope) return null;
  return scope === 'both' ? 'both' : 'single';
}

function brickworkDetailsFromFloorWork(
  floorWork: readonly MistriFloorWork[],
): MistriBrickworkDetails | null {
  const brick = floorWork.find((fw) => fw.workTypes.includes('brick_aac') && fw.brickMaterial);
  if (!brick?.brickMaterial) return null;
  const plasteringScope: MistriWallPlasteringScope = brick.workTypes.includes('plastering')
    ? brick.plasterScope === 'both'
      ? 'both'
      : 'single'
    : 'none';
  return { materialType: brick.brickMaterial, plasteringScope };
}

function isNewFormatMistriDetails(
  v: Record<string, unknown>,
  floorWork: MistriFloorWork[],
): boolean {
  const contractType = normalizeContractType(v.contractType);
  const { currentFloorPlan, futureFloorPlan } = extractFloorPlans(v);
  const additionalOk =
    v.additionalRequirements === undefined ||
    v.additionalRequirements === null ||
    typeof v.additionalRequirements === 'string';

  if (
    typeof v.approximateAreaSqft !== 'number' ||
    !Number.isFinite(v.approximateAreaSqft) ||
    v.approximateAreaSqft <= 0 ||
    typeof v.projectStartTimeType !== 'string' ||
    !START_TIME_TYPES.has(v.projectStartTimeType as MistriStartTimeType) ||
    !additionalOk
  ) {
    return false;
  }

  if (mistriContractTypeRequiredForFloorWork(floorWork) && contractType == null) {
    return false;
  }

  if (mistriFoundationProvisionRequired(floorWork)) {
    const current = currentFloorPlan ?? currentFloorPlanFromFloorWork(floorWork);
    if (!futureFloorPlan) return false;
    const currentN = floorPlanUpperCount(current);
    const futureN = floorPlanUpperCount(futureFloorPlan);
    if (currentN == null || futureN == null || futureN < currentN) return false;
  }

  return true;
}

export function isMistriDetails(value: unknown): value is MistriDetails {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  if (v.floorWork != null) {
    const floorWork = normalizeMistriFloorWork(v.floorWork);
    if (!floorWork || floorWork.length === 0) return false;
    return isNewFormatMistriDetails(v, floorWork);
  }

  const civilWorkTypes = normalizeCivilWorkTypes(v.civilWorkTypes);
  const contractType = normalizeContractType(v.contractType);
  const { currentFloorPlan, futureFloorPlan, floorLevel } = extractFloorPlans(v);
  const floorRequired = mistriFloorLevelRequired(civilWorkTypes);
  const contractRequired = mistriContractTypeRequired(civilWorkTypes);
  const additionalOk =
    v.additionalRequirements === undefined ||
    v.additionalRequirements === null ||
    typeof v.additionalRequirements === 'string';

  if (
    civilWorkTypes.length === 0 ||
    typeof v.approximateAreaSqft !== 'number' ||
    !Number.isFinite(v.approximateAreaSqft) ||
    v.approximateAreaSqft <= 0 ||
    (floorRequired && (!currentFloorPlan || !futureFloorPlan)) ||
    (contractRequired && contractType == null) ||
    typeof v.projectStartTimeType !== 'string' ||
    !START_TIME_TYPES.has(v.projectStartTimeType as MistriStartTimeType) ||
    !additionalOk
  ) {
    return false;
  }

  if (v.contractType != null && v.contractType !== '' && !contractType) {
    return false;
  }

  // Optional floor plans: if present they must normalize.
  if (v.currentFloorPlan != null && v.currentFloorPlan !== '' && !currentFloorPlan) {
    return false;
  }
  if (v.futureFloorPlan != null && v.futureFloorPlan !== '' && !futureFloorPlan) {
    return false;
  }

  // Legacy floor: unknown strings fail (except 3rd_above).
  if (
    v.floorLevel != null &&
    v.floorLevel !== '' &&
    !floorLevel &&
    v.floorLevel !== '3rd_above'
  ) {
    return false;
  }

  if (civilWorkTypes.includes('plastering')) {
    const side = normalizePlasterSide(v.plasterSide);
    if (v.plasterSide != null && !side) return false;
  }

  if (v.brickworkDetails != null) {
    if (!normalizeBrickworkDetails(v.brickworkDetails)) return false;
  }

  if (v.boundaryWallDetails != null) {
    if (!normalizeBoundaryWallDetails(v.boundaryWallDetails)) return false;
  }

  // Optional work-area floors (newer field): if present, must be valid.
  if (v.workAreaFloors != null) {
    const workArea = normalizeWorkAreaFloors(v.workAreaFloors);
    if (!workArea) return false;
    if (workArea.includes('custom')) {
      const customOk =
        v.workAreaCustomFloors === undefined ||
        v.workAreaCustomFloors === null ||
        typeof v.workAreaCustomFloors === 'string';
      if (!customOk) return false;
    }
  } else if (
    v.workAreaCustomFloors != null &&
    typeof v.workAreaCustomFloors !== 'string'
  ) {
    return false;
  }

  if (currentFloorPlan && futureFloorPlan) {
    const currentN = floorPlanUpperCount(currentFloorPlan);
    const futureN = floorPlanUpperCount(futureFloorPlan);
    if (currentN == null || futureN == null || futureN < currentN) return false;
  }

  if (floorLevel === 'custom' && v.floorLevel === 'custom') {
    const count = normalizeLegacyCustomFloorCount(floorLevel, v.customFloorCount, v.floorLevel);
    if (count == null && !currentFloorPlan) return false;
  }

  return true;
}

function parseChowkhatFields(raw: Record<string, unknown>): {
  includeDoorWindowFrames: boolean;
  doorWindowFramesQuantity: string | null;
} {
  const quantity =
    typeof raw.doorWindowFramesQuantity === 'string' && raw.doorWindowFramesQuantity.trim()
      ? raw.doorWindowFramesQuantity.trim()
      : null;
  const include =
    raw.includeDoorWindowFrames === true ||
    (raw.includeDoorWindowFrames !== false && quantity != null);
  return {
    includeDoorWindowFrames: include,
    doorWindowFramesQuantity: include ? quantity : null,
  };
}

export function parseMistriDetails(value: unknown): MistriDetails | null {
  if (!value || typeof value !== 'object') return null;
  if (!isMistriDetails(value)) return null;

  const raw = value as unknown as Record<string, unknown>;
  const floorWork = normalizeMistriFloorWork(raw.floorWork);
  const contractType = normalizeContractType(raw.contractType);
  const { currentFloorPlan, futureFloorPlan, floorLevel, customFloorCount } =
    extractFloorPlans(raw);

  const projectStartTimeType = raw.projectStartTimeType as MistriStartTimeType;
  const specific =
    projectStartTimeType === 'specific' &&
    typeof raw.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw.projectStartTimeSpecificDate)
      ? raw.projectStartTimeSpecificDate
      : null;

  const additionalRequirements =
    typeof raw.additionalRequirements === 'string' && raw.additionalRequirements.trim()
      ? raw.additionalRequirements.trim()
      : null;

  const approximateAreaSqft =
    typeof raw.approximateAreaSqft === 'number' ? raw.approximateAreaSqft : NaN;
  if (!Number.isFinite(approximateAreaSqft) || approximateAreaSqft <= 0) return null;

  const chowkhat = parseChowkhatFields(raw);

  if (floorWork && floorWork.length > 0) {
    const derivedCivil = civilWorkTypesFromFloorWork(floorWork);
    const foundationRequired = mistriFoundationProvisionRequired(floorWork);
    const contractRequired = mistriContractTypeRequiredForFloorWork(floorWork);
    const assamOnly = isAssamOnlyFloorWork(floorWork);
    if (contractRequired && !contractType) return null;
    const resolvedCurrent =
      currentFloorPlan ?? currentFloorPlanFromFloorWork(floorWork);
    if (foundationRequired && !futureFloorPlan) return null;

    return {
      floorWork,
      civilWorkTypes: derivedCivil.length > 0 ? derivedCivil : ['complete_full_structure'],
      plasterSide: plasterSideFromScope(
        floorWork.find((fw) => fw.plasterScope)?.plasterScope,
      ),
      brickworkDetails: brickworkDetailsFromFloorWork(floorWork),
      boundaryWallDetails: null,
      approximateAreaSqft,
      currentFloorPlan: resolvedCurrent,
      futureFloorPlan,
      workAreaFloors: null,
      workAreaCustomFloors: null,
      floorLevel: null,
      customFloorCount: null,
      contractType: assamOnly
        ? (contractType ?? 'labor_only')
        : contractRequired
          ? contractType
          : null,
      projectStartTimeType,
      projectStartTimeSpecificDate: specific,
      additionalRequirements,
      includeDoorWindowFrames: chowkhat.includeDoorWindowFrames,
      doorWindowFramesQuantity: chowkhat.doorWindowFramesQuantity,
    };
  }

  const civilWorkTypes = normalizeCivilWorkTypes(raw.civilWorkTypes);
  const floorRequired = mistriFloorLevelRequired(civilWorkTypes);
  const contractRequired = mistriContractTypeRequired(civilWorkTypes);
  if (civilWorkTypes.length === 0) return null;
  if (contractRequired && !contractType) return null;
  if (floorRequired && (!currentFloorPlan || !futureFloorPlan)) return null;

  const plasterSide = civilWorkTypes.includes('plastering')
    ? normalizePlasterSide(raw.plasterSide)
    : null;

  const brickworkDetails = civilWorkTypes.includes('brickwork_aac')
    ? normalizeBrickworkDetails(raw.brickworkDetails)
    : null;

  const boundaryWallDetails = civilWorkTypes.includes('boundary_wall_fencing')
    ? normalizeBoundaryWallDetails(raw.boundaryWallDetails)
    : null;

  const workAreaRequired = mistriWorkAreaRequired(civilWorkTypes);
  const workAreaFloors = workAreaRequired
    ? normalizeWorkAreaFloors(raw.workAreaFloors)
    : null;
  const workAreaCustomFloors =
    workAreaFloors?.includes('custom') &&
    typeof raw.workAreaCustomFloors === 'string' &&
    raw.workAreaCustomFloors.trim()
      ? raw.workAreaCustomFloors.trim()
      : null;

  return {
    civilWorkTypes,
    plasterSide,
    brickworkDetails,
    boundaryWallDetails,
    approximateAreaSqft,
    currentFloorPlan,
    futureFloorPlan,
    workAreaFloors,
    workAreaCustomFloors,
    floorLevel: floorLevel ?? null,
    customFloorCount:
      floorLevel === 'custom' ? (customFloorCount ?? 3) : null,
    contractType: contractRequired ? contractType : null,
    projectStartTimeType,
    projectStartTimeSpecificDate: specific,
    additionalRequirements,
    includeDoorWindowFrames: chowkhat.includeDoorWindowFrames,
    doorWindowFramesQuantity: chowkhat.doorWindowFramesQuantity,
  };
}

export function formatMistriArea(area: number): string {
  return `Approx. ${area.toLocaleString('en-IN')} Sq. Ft.`;
}

export function formatMistriCivilWorkTypes(details: MistriDetails): string {
  return summarizeMistriCivilWorkScope(details.civilWorkTypes, details.plasterSide);
}

/**
 * Combine selected civil work types into a cohesive scope phrase for titles/summaries.
 * Brickwork + Plastering → "Brickwork with Both Side Plaster" (etc.).
 */
export function summarizeMistriCivilWorkScope(
  civilWorkTypes: readonly MistriCivilWorkType[],
  plasterSide?: MistriPlasterSide | null,
): string {
  const types = normalizeMistriCivilWorkSelection(civilWorkTypes);
  if (types.length === 0) return '';

  if (types.includes('complete_full_structure')) {
    const fullLabel = 'Complete Full Structure (Foundation to Plastering)';
    if (types.includes('tile_marble_flooring')) {
      return `${fullLabel} with Flooring Work (Tiles / Marble / Granites Work)`;
    }
    return fullLabel;
  }

  const hasBrick = types.includes('brickwork_aac');
  const hasPlaster = types.includes('plastering');
  const parts: string[] = [];

  if (hasBrick && hasPlaster) {
    if (plasterSide === 'single') {
      parts.push('Brickwork with Single Side Plaster');
    } else if (plasterSide === 'both') {
      parts.push('Brickwork with Both Side Plaster');
    } else {
      parts.push('Brickwork with Plastering');
    }
  } else {
    if (hasBrick) parts.push(optionLabel(MISTRI_CIVIL_WORK_OPTIONS, 'brickwork_aac'));
    if (hasPlaster) {
      if (plasterSide === 'single') parts.push('Plastering Work (Single Side)');
      else if (plasterSide === 'both') parts.push('Plastering Work (Both Side)');
      else parts.push('Plastering Work');
    }
  }

  for (const t of types) {
    if (t === 'brickwork_aac' || t === 'plastering') continue;
    parts.push(optionLabel(MISTRI_CIVIL_WORK_OPTIONS, t));
  }

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} with ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

export function formatMistriFloorPlan(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  const normalized = normalizeFloorPlanValue(value);
  if (!normalized) return value;
  if (normalized === 'G+0') return 'Ground Floor';
  const upper = floorPlanUpperCount(normalized);
  if (upper == null) return normalized;
  if (upper === 1) return 'G+1 (Ground + 1 Floor)';
  return `${normalized} (Ground + ${upper} Floors)`;
}

/** @deprecated Prefer formatMistriFloorPlan / dual current+future blocks. */
export function formatMistriFloorLevel(details: MistriDetails): string {
  if (details.currentFloorPlan) {
    return formatMistriFloorPlan(details.currentFloorPlan);
  }
  if (!details.floorLevel) return 'Not specified';
  if (details.floorLevel === 'custom') {
    const n = details.customFloorCount;
    if (n != null && n > 0) {
      return n === 1 ? '1 Floor' : `${n} Floors`;
    }
    return '3+ Floors (Specify Exact)';
  }
  return optionLabel(MISTRI_FLOOR_LEVEL_OPTIONS, details.floorLevel);
}

export function formatMistriStartTime(details: MistriDetails): string {
  switch (details.projectStartTimeType) {
    case '1week':
      return 'Within one week';
    case '2week':
      return 'Within two week';
    case '1month':
      return 'Within 1 month';
    case 'specific':
      return details.projectStartTimeSpecificDate ?? 'Specific Date';
    default:
      return '—';
  }
}

export function getMistriWorkRequirementBlocks(details: MistriDetails): {
  label: string;
  value: string;
}[] {
  if (details.floorWork && details.floorWork.length > 0) {
    const blocks: { label: string; value: string }[] = sortMistriFloorWork(
      details.floorWork,
    ).map((fw) => ({
      label: formatMistriFloorWorkLabel(fw),
      value: formatMistriFloorWorkTypes(fw.workTypes, fw),
    }));

    blocks.push({
      label: 'Approximate built-up Area (Sqft)',
      value: formatMistriArea(details.approximateAreaSqft),
    });

    const assamWork = details.floorWork.find((fw) => isAssamMistriFloor(fw.floorId));
    if (assamWork?.assamRoofType) {
      blocks.push({
        label: 'Roof Truss Type',
        value: optionLabel(MISTRI_ASSAM_ROOF_OPTIONS, assamWork.assamRoofType),
      });
    }
    if (assamWork?.assamRoofingSheet) {
      blocks.push({
        label: 'Roofing Sheet Material',
        value: optionLabel(MISTRI_ASSAM_ROOFING_SHEET_OPTIONS, assamWork.assamRoofingSheet),
      });
    }
    if (assamWork?.foundationDepthFt != null && assamWork.foundationDepthFt > 0) {
      blocks.push({
        label: 'Foundation Depth',
        value: `${assamWork.foundationDepthFt} ft`,
      });
    }

    if (mistriFoundationProvisionRequired(details.floorWork) && details.futureFloorPlan) {
      blocks.push({
        label: 'Foundation Provision For',
        value: formatMistriFloorPlan(details.futureFloorPlan),
      });
    }

    if (mistriContractTypeRequiredForFloorWork(details.floorWork)) {
      blocks.push({
        label: 'Contract Type',
        value: formatMistriContractTypeLabel(details.contractType),
      });
    }

    blocks.push({
      label: 'Work Start Time',
      value: formatMistriStartTime(details),
    });

    if (hasMistriChowkhat(details)) {
      blocks.push({
        label: MISTRI_CHOWKHAT_SECTION_LABEL,
        value: MISTRI_CHOWKHAT_LABEL,
      });
      if (details.doorWindowFramesQuantity) {
        blocks.push({
          label: 'Quantity / Count (Door & Window Frames)',
          value: details.doorWindowFramesQuantity,
        });
      }
    }

    if (details.additionalRequirements) {
      blocks.push({
        label: 'Additional Notes',
        value: details.additionalRequirements,
      });
    }

    return blocks;
  }

  const blocks: { label: string; value: string }[] = [
    {
      label: 'Civil Work Type',
      value: formatMistriCivilWorkTypes(details),
    },
  ];

  if (details.brickworkDetails) {
    blocks.push(
      {
        label: 'Wall Material',
        value: optionLabel(
          MISTRI_BRICKWORK_MATERIAL_OPTIONS,
          details.brickworkDetails.materialType,
        ),
      },
      {
        label: 'Brickwork Plastering',
        value: optionLabel(
          MISTRI_WALL_PLASTERING_SCOPE_OPTIONS,
          details.brickworkDetails.plasteringScope,
        ),
      },
    );
  }

  if (details.boundaryWallDetails) {
    blocks.push(
      {
        label: 'Boundary Wall Thickness',
        value: optionLabel(
          MISTRI_BOUNDARY_WALL_THICKNESS_OPTIONS,
          details.boundaryWallDetails.thickness,
        ),
      },
      {
        label: 'Boundary Wall Structure',
        value: optionLabel(
          MISTRI_BOUNDARY_WALL_STRUCTURE_OPTIONS,
          details.boundaryWallDetails.structureType,
        ),
      },
      {
        label: 'Boundary Wall Plastering',
        value: optionLabel(
          MISTRI_WALL_PLASTERING_SCOPE_OPTIONS,
          details.boundaryWallDetails.plasteringFinish,
        ),
      },
    );
  }

  blocks.push({
    label: 'Approximate built-up Area (Sqft)',
    value: formatMistriArea(details.approximateAreaSqft),
  });

  if (details.currentFloorPlan || details.futureFloorPlan) {
    blocks.push({
      label: 'Current Build Floors',
      value: formatMistriFloorPlan(details.currentFloorPlan),
    });
    blocks.push({
      label: 'Foundation Provision For',
      value: formatMistriFloorPlan(details.futureFloorPlan),
    });
  } else if (details.floorLevel) {
    blocks.push({
      label: 'Floor Level',
      value: formatMistriFloorLevel(details),
    });
  }

  if (details.workAreaFloors && details.workAreaFloors.length > 0) {
    blocks.push({
      label: 'Work Area (Floors)',
      value: formatMistriWorkAreaFloors(
        details.workAreaFloors,
        details.workAreaCustomFloors,
      ),
    });
  }

  if (mistriContractTypeRequired(details.civilWorkTypes)) {
    blocks.push({
      label: 'Contract Type',
      value: formatMistriContractTypeLabel(details.contractType),
    });
  }

  blocks.push({
    label: 'Work Start Time',
    value: formatMistriStartTime(details),
  });

  if (hasMistriChowkhat(details)) {
    blocks.push({
      label: MISTRI_CHOWKHAT_SECTION_LABEL,
      value: MISTRI_CHOWKHAT_LABEL,
    });
    if (details.doorWindowFramesQuantity) {
      blocks.push({
        label: 'Quantity / Count (Door & Window Frames)',
        value: details.doorWindowFramesQuantity,
      });
    }
  }

  if (details.additionalRequirements) {
    blocks.push({
      label: 'Additional Notes',
      value: details.additionalRequirements,
    });
  }

  return blocks;
}

/**
 * Map a clean "G+N" floor plan → legacy building_types for DB / bidding compatibility.
 * Uses future planned capacity when available (foundation sized for max height).
 */
export function buildingTypesFromFloorPlan(
  floorPlan: string | null | undefined,
): BuildingType[] {
  const upper = floorPlanUpperCount(floorPlan);
  if (upper == null || upper <= 0) {
    return ['RCC Ground Floor'];
  }
  // G+N → ground + N upper floors (capped at available RCC types).
  const count = Math.min(upper + 1, RCC_BUILDING_TYPES.length);
  return RCC_BUILDING_TYPES.slice(0, count);
}

/**
 * @deprecated Prefer buildingTypesFromFloorPlan with futureFloorPlan.
 * Map legacy floor level → building_types.
 */
export function buildingTypesFromMistriFloor(
  floor: MistriFloorLevel | null | undefined,
  customFloorCount?: number | null,
): BuildingType[] {
  if (!floor) return ['RCC Ground Floor'];
  return buildingTypesFromFloorPlan(legacyFloorToPlan(floor, customFloorCount ?? null));
}

export function buildingTypesFromMistriDetails(details: MistriDetails): BuildingType[] {
  if (details.floorWork && details.floorWork.length > 0) {
    return buildingTypesFromFloorWork(details.floorWork);
  }
  if (details.currentFloorPlan || details.futureFloorPlan) {
    return buildingTypesFromFloorPlan(details.futureFloorPlan ?? details.currentFloorPlan);
  }
  return buildingTypesFromMistriFloor(details.floorLevel ?? null, details.customFloorCount);
}

/** Derive construction_types from civil work selection + floor plan. */
export function constructionTypesFromMistriDetails(
  details: MistriDetails,
): ConstructionTypesMap {
  if (details.floorWork && details.floorWork.length > 0) {
    const map: ConstructionTypesMap = {};
    const buildingTypes = buildingTypesFromFloorWork(details.floorWork);
    for (const bt of buildingTypes) {
      const fw = details.floorWork.find((item) => {
        if (item.floorId === bt) return true;
        if (item.floorId === MISTRI_CUSTOM_FLOOR_ID) {
          return mappedCustomBuildingType(item.customFloorNumber ?? MIN_CUSTOM_RCC_FLOOR) === bt;
        }
        return false;
      });
      map[bt] = constructionTypeFromFloorWork(bt, fw);
    }
    return map;
  }

  const plan = details.futureFloorPlan ?? details.currentFloorPlan;
  const buildingTypes = plan
    ? buildingTypesFromFloorPlan(plan)
    : buildingTypesFromMistriFloor(details.floorLevel ?? null, details.customFloorCount);
  const isFull = details.civilWorkTypes.includes('complete_full_structure');

  const map: ConstructionTypesMap = {};
  for (const bt of buildingTypes) {
    if (isFull) {
      map[bt] = CONSTRUCTION_TYPE_FULL;
    } else if (bt === 'RCC Ground Floor') {
      map[bt] = CONSTRUCTION_TYPE_GROUND;
    } else {
      map[bt] = CONSTRUCTION_TYPE_UPPER;
    }
  }
  return map;
}

export function validateMistriFloorWorkInput(input: {
  floorWork: MistriFloorWork[];
  approximateArea: string | number;
  futureFloorOption: MistriFutureFloorOption | null;
  futureFloorCustom: string | number;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
  includeDoorWindowFrames?: boolean;
}): { error: string } | { details: MistriDetails } {
  if (!input.floorWork.length) {
    return { error: 'Select Assam Type or at least one RCC floor.' };
  }

  for (const fw of input.floorWork) {
    const label = formatMistriFloorWorkLabel(fw);
    if (fw.workTypes.length === 0) {
      return { error: `Select work type for ${label}.` };
    }

    if (isAssamMistriFloor(fw.floorId)) {
      if (!fw.workTypes.includes('full_finished') || fw.workTypes.length !== 1) {
        return {
          error: 'Assam Type is Full finishing upto Plastering and Roof work. Complete the Assam work requirements.',
        };
      }
      if (!fw.assamRoofType || !ASSAM_ROOF_SET.has(fw.assamRoofType)) {
        return { error: 'Select roof truss type: Steel Truss, RCC Truss, or Wood Truss.' };
      }
      if (!fw.assamRoofingSheet || !ASSAM_ROOFING_SHEET_SET.has(fw.assamRoofingSheet)) {
        return { error: 'Select roofing sheet material for Assam Type.' };
      }
      if (fw.foundationDepthFt == null || fw.foundationDepthFt <= 0) {
        return { error: 'Enter foundation depth in feet for Assam Type.' };
      }
      if (fw.includeFineFlooring !== true && fw.includeFineFlooring !== false) {
        return {
          error: 'Choose whether you want flooring (Tile / Marble / Smooth Cement Finish) for Assam Type.',
        };
      }
      if (fw.includeFineFlooring && !fw.flooringMaterial) {
        return {
          error: 'Select flooring material (Tile, Marble, or Smooth Cement Finish) for Assam Type.',
        };
      }
      if (
        fw.includeFineFlooring &&
        fw.flooringMaterial &&
        !ASSAM_FLOORING_MATERIAL_SET.has(fw.flooringMaterial)
      ) {
        return {
          error: 'Select flooring material (Tile, Marble, or Smooth Cement Finish) for Assam Type.',
        };
      }
      if (fw.includeFineFlooring === true && parseApproximateAreaSqft(fw.flooringAreaSqft ?? '') == null) {
        return {
          error: 'Enter the approximate flooring work area (sq. ft.) for Assam Type.',
        };
      }
      continue;
    }

    if (fw.workTypes.includes('brick_aac') && !fw.brickMaterial) {
      return { error: `Select Red Brick or AAC Block for ${label}.` };
    }
    if (
      isMistriWallPlasterOnlyFloor(fw) &&
      parseApproximateAreaSqft(fw.wallAreaSqft ?? '') == null
    ) {
      return {
        error: `Enter the approximate wall area (sq. ft.) for ${label}.`,
      };
    }
    if (fw.workTypes.includes('plastering') && !fw.plasterScope) {
      fw.plasterScope = 'both';
    }
    if (fw.workTypes.includes('flooring') && !fw.flooringMaterial) {
      return { error: `Select flooring material (Tile, Marble, or Granite) for ${label}.` };
    }
    if (
      (fw.includeFineFlooring === true || fw.workTypes.includes('flooring')) &&
      parseApproximateAreaSqft(fw.flooringAreaSqft ?? '') == null
    ) {
      return {
        error: `Enter the approximate flooring work area (sq. ft.) for ${label}.`,
      };
    }
    if (fw.workTypes.includes('full_finished') && !isAssamMistriFloor(fw.floorId)) {
      if (fw.includeFineFlooring === true) {
        const material = normalizeFlooringMaterial(fw.flooringMaterial);
        if (!material || material === 'smooth_cement_finish') {
          return {
            error: `Select flooring material (Tiles, Marble, or Granite) for ${label}.`,
          };
        }
        fw.flooringMaterial = material;
      } else {
        fw.includeFineFlooring = false;
        if (!fw.workTypes.includes('flooring')) fw.flooringMaterial = null;
      }
    } else if (fw.workTypes.includes('full_finished')) {
      if (fw.includeFineFlooring !== true && fw.includeFineFlooring !== false) {
        return {
          error: `Choose whether you want flooring (Tile / Marble / Granite) for ${label}.`,
        };
      }
      if (fw.includeFineFlooring && !fw.flooringMaterial) {
        return {
          error: `Select flooring material (Tile, Marble, or Granite) for ${label}.`,
        };
      }
    }
  }

  for (const fw of input.floorWork) {
    if (isAssamMistriFloor(fw.floorId)) continue;
    const scope = rccScopeFromWorkTypes(fw.workTypes, fw.scopeOption);
    if (scope) {
      fw.scopeOption = scope;
      fw.scopeLabel = formatMistriRccScopeDescription(
        fw.floorId,
        scope,
        fw.includeFineFlooring === true,
        fw.brickMaterial,
        fw.flooringMaterial,
      );
    }
  }

  if (hasStructuralFramingDiscontinuity(input.floorWork)) {
    return { error: STRUCTURAL_FRAMING_CONTINUITY_MESSAGE };
  }

  for (const fw of input.floorWork) {
    if (isAssamMistriFloor(fw.floorId)) continue;
    const scope = rccScopeFromWorkTypes(fw.workTypes, fw.scopeOption);
    if (
      isStructuralRccScope(scope) &&
      isUpperFloorStructuralScopeBlocked(fw.floorId, input.floorWork, fw.customFloorNumber)
    ) {
      return { error: UPPER_FLOOR_STRUCTURAL_REQUIRES_LOWER_FRAME };
    }
  }

  for (const fw of input.floorWork) {
    if (isAssamMistriFloor(fw.floorId)) continue;
    const scope = rccScopeFromWorkTypes(fw.workTypes, fw.scopeOption);
    if (
      scope === 'wall_plaster_only' &&
      isWallPlasterScopeBlocked(fw.floorId, input.floorWork, fw.customFloorNumber)
    ) {
      return {
        error: isUpperFloorWallScopeBlocked(fw.floorId, input.floorWork, fw.customFloorNumber)
          ? UPPER_FLOOR_WALL_LOCKED_BY_LOWER_STRUCTURE
          : OPTION_3_REQUIRES_EXISTING_SLAB,
      };
    }
  }

  const floorWork = normalizeMistriFloorWork(input.floorWork);
  if (!floorWork || floorWork.length === 0) {
    return { error: 'Select work type for each selected floor.' };
  }

  const area = parseApproximateAreaSqft(input.approximateArea);
  if (area == null) {
    return { error: 'Enter the approximate built-up area in sqft.' };
  }

  const currentFloorPlan = currentFloorPlanFromFloorWork(floorWork);
  let futureFloorPlan: string | null = null;

  if (mistriFoundationProvisionRequired(floorWork)) {
    const futureResolved = resolveFutureFloorPlan(
      'custom',
      input.futureFloorCustom,
      currentFloorPlan,
    );
    if ('error' in futureResolved) {
      return { error: FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE };
    }
    futureFloorPlan = futureResolved.value;
    const currentN = floorPlanUpperCount(currentFloorPlan);
    const futureN = floorPlanUpperCount(futureFloorPlan);
    if (currentN == null || futureN == null) {
      return { error: FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE };
    }
    // Must be strictly above the highest floor currently under construction.
    if (futureN <= currentN) {
      return { error: FOUNDATION_CAPACITY_INVALID_MESSAGE };
    }
  }

  let contractType: MistriContractType | null = null;
  if (isAssamOnlyFloorWork(floorWork)) {
    contractType = 'labor_only';
  } else if (mistriContractTypeRequiredForFloorWork(floorWork)) {
    if (!input.contractType || !CONTRACT_SET.has(input.contractType)) {
      return { error: 'Select a contract type.' };
    }
    contractType = input.contractType;
  }

  if (!input.projectStartTimeType || !START_TIME_TYPES.has(input.projectStartTimeType)) {
    return { error: 'Select when the project should start.' };
  }

  const additional = input.additionalRequirements.trim() || null;
  const includeDoorWindowFrames = input.includeDoorWindowFrames === true;
  const doorWindowFramesQuantity = null;
  const civilWorkTypes = civilWorkTypesFromFloorWork(floorWork);
  const plasterSide = plasterSideFromScope(
    floorWork.find((fw) => fw.plasterScope)?.plasterScope,
  );
  const brickworkDetails = brickworkDetailsFromFloorWork(floorWork);

  const base: Omit<MistriDetails, 'projectStartTimeType' | 'projectStartTimeSpecificDate'> = {
    floorWork,
    civilWorkTypes,
    plasterSide,
    brickworkDetails,
    boundaryWallDetails: null,
    approximateAreaSqft: area,
    currentFloorPlan,
    futureFloorPlan,
    workAreaFloors: null,
    workAreaCustomFloors: null,
    floorLevel: null,
    customFloorCount: null,
    contractType,
    additionalRequirements: additional,
    includeDoorWindowFrames,
    doorWindowFramesQuantity,
  };

  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: 'Select a specific project start date.' };
    }
    if (!isProjectStartDateNotInPast(date)) {
      return { error: PROJECT_START_DATE_PAST_INVALID_MESSAGE };
    }
    return {
      details: {
        ...base,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
      },
    };
  }

  return {
    details: {
      ...base,
      projectStartTimeType: input.projectStartTimeType,
      projectStartTimeSpecificDate: null,
    },
  };
}

export function validateMistriDetailsInput(input: {
  civilWorkTypes: MistriCivilWorkType[];
  plasterSide: MistriPlasterSide | null;
  brickworkMaterial: MistriBrickworkMaterial | null;
  brickworkPlastering: MistriWallPlasteringScope | null;
  boundaryWallThickness: MistriBoundaryWallThickness | null;
  boundaryWallStructure: MistriBoundaryWallStructure | null;
  boundaryWallPlastering: MistriWallPlasteringScope | null;
  approximateArea: string | number;
  currentFloorOption: MistriCurrentFloorOption | null;
  currentFloorCustom: string | number;
  futureFloorOption: MistriFutureFloorOption | null;
  futureFloorCustom: string | number;
  workAreaFloors: MistriWorkAreaFloor[];
  workAreaCustomFloors: string;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}): { error: string } | { details: MistriDetails } {
  const civilWorkTypes = normalizeMistriCivilWorkSelection(
    input.civilWorkTypes.filter(
      (t, i, arr) => CIVIL_WORK_SET.has(t) && arr.indexOf(t) === i,
    ),
  ).slice(0, 1);
  if (civilWorkTypes.length === 0) {
    return { error: 'Select a type of civil work.' };
  }

  let plasterSide: MistriPlasterSide | null = null;
  if (civilWorkTypes.includes('plastering')) {
    if (!input.plasterSide || !PLASTER_SIDE_SET.has(input.plasterSide)) {
      return { error: 'Select Single Side or Both Side plaster.' };
    }
    plasterSide = input.plasterSide;
  }

  let brickworkDetails: MistriBrickworkDetails | null = null;
  if (civilWorkTypes.includes('brickwork_aac')) {
    const materialType = normalizeBrickworkMaterial(input.brickworkMaterial);
    const plasteringScope = normalizeWallPlasteringScope(input.brickworkPlastering);
    if (!materialType) {
      return { error: 'Select the wall material for brickwork (Red Brick or AAC Block).' };
    }
    if (!plasteringScope) {
      return { error: 'Select plastering work required for these walls.' };
    }
    brickworkDetails = { materialType, plasteringScope };
  }

  let boundaryWallDetails: MistriBoundaryWallDetails | null = null;
  if (civilWorkTypes.includes('boundary_wall_fencing')) {
    const thickness = normalizeBoundaryWallThickness(input.boundaryWallThickness);
    const structureType = normalizeBoundaryWallStructure(input.boundaryWallStructure);
    const plasteringFinish = normalizeWallPlasteringScope(input.boundaryWallPlastering);
    if (!thickness) {
      return { error: 'Select the thickness/size of the boundary wall.' };
    }
    if (!structureType) {
      return { error: 'Select the type of boundary wall structure.' };
    }
    if (!plasteringFinish) {
      return { error: 'Select the plastering finish required for the boundary wall.' };
    }
    boundaryWallDetails = { thickness, structureType, plasteringFinish };
  }

  const area = parseApproximateAreaSqft(input.approximateArea);
  if (area == null) {
    return { error: 'Enter an approximate project area in sq.ft. (rough estimate is fine).' };
  }

  const floorRequired = mistriFloorLevelRequired(civilWorkTypes);
  let currentFloorPlan: string | null = null;
  let futureFloorPlan: string | null = null;

  if (floorRequired) {
    const currentResolved = resolveCurrentFloorPlan(
      input.currentFloorOption,
      input.currentFloorCustom,
    );
    if ('error' in currentResolved) {
      if (
        input.currentFloorOption === 'custom' &&
        currentResolved.error === CUSTOM_FLOOR_PLAN_INVALID_MESSAGE
      ) {
        return { error: CUSTOM_FLOOR_PLAN_INVALID_MESSAGE };
      }
      return { error: 'Select how many floors you plan to build in this current project.' };
    }

    const futureResolved = resolveFutureFloorPlan(
      input.futureFloorOption,
      input.futureFloorCustom,
      currentResolved.value,
    );
    if ('error' in futureResolved) {
      if (
        input.futureFloorOption === 'custom' &&
        (futureResolved.error === FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE ||
          futureResolved.error === CUSTOM_FLOOR_PLAN_INVALID_MESSAGE)
      ) {
        return { error: FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE };
      }
      return { error: 'Select foundation provision for (highest floor capacity or above).' };
    }

    currentFloorPlan = currentResolved.value;
    futureFloorPlan = futureResolved.value;

    const currentN = floorPlanUpperCount(currentFloorPlan);
    const futureN = floorPlanUpperCount(futureFloorPlan);
    if (currentN == null || futureN == null) {
      return { error: FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE };
    }
    if (futureN < currentN) {
      return {
        error: FOUNDATION_CAPACITY_INVALID_MESSAGE,
      };
    }
  } else {
    // Non-structural work: floor planning does not apply — ignore any leftover selections.
    currentFloorPlan = null;
    futureFloorPlan = null;
  }

  const workAreaRequired = mistriWorkAreaRequired(civilWorkTypes);
  let workAreaFloors: MistriWorkAreaFloor[] | null = null;
  let workAreaCustomFloors: string | null = null;

  if (workAreaRequired) {
    const normalized = normalizeWorkAreaFloors(input.workAreaFloors);
    if (!normalized) {
      return { error: 'Select at least one work area floor.' };
    }
    if (normalized.includes('custom')) {
      const custom = String(input.workAreaCustomFloors ?? '').trim();
      if (!custom) {
        return { error: 'Enter custom floor details for the work area.' };
      }
      workAreaCustomFloors = custom;
    }
    workAreaFloors = normalized;
  }

  let contractType: MistriContractType | null = null;
  if (mistriContractTypeRequired(civilWorkTypes)) {
    if (!input.contractType || !CONTRACT_SET.has(input.contractType)) {
      return { error: 'Select a contract type.' };
    }
    contractType = input.contractType;
  }

  if (!input.projectStartTimeType || !START_TIME_TYPES.has(input.projectStartTimeType)) {
    return { error: 'Select when the project should start.' };
  }

  const additional = input.additionalRequirements.trim() || null;

  const base: Omit<MistriDetails, 'projectStartTimeType' | 'projectStartTimeSpecificDate'> = {
    civilWorkTypes,
    plasterSide,
    brickworkDetails,
    boundaryWallDetails,
    approximateAreaSqft: area,
    currentFloorPlan,
    futureFloorPlan,
    workAreaFloors,
    workAreaCustomFloors,
    floorLevel: null,
    customFloorCount: null,
    contractType,
    additionalRequirements: additional,
  };

  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: 'Select a specific project start date.' };
    }
    if (!isProjectStartDateNotInPast(date)) {
      return { error: PROJECT_START_DATE_PAST_INVALID_MESSAGE };
    }
    return {
      details: {
        ...base,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
      },
    };
  }

  return {
    details: {
      ...base,
      projectStartTimeType: input.projectStartTimeType,
      projectStartTimeSpecificDate: null,
    },
  };
}

/** Create-time gate: nested brickwork / boundary wall answers are required on new posts. */
export function mistriNestedDetailsCreateError(details: MistriDetails): string | null {
  if (details.floorWork && details.floorWork.length > 0) {
    return null;
  }
  if (
    details.civilWorkTypes.includes('brickwork_aac') &&
    !normalizeBrickworkDetails(details.brickworkDetails)
  ) {
    return 'Answer all brickwork questions (wall material and plastering scope).';
  }
  if (
    details.civilWorkTypes.includes('boundary_wall_fencing') &&
    !normalizeBoundaryWallDetails(details.boundaryWallDetails)
  ) {
    return 'Answer all boundary wall questions (thickness, structure, and plastering).';
  }
  return null;
}

// ============================================================
// Mistri Contractor work requirements — stored as projects.mistri_details
// ============================================================

import type { BuildingType, ConstructionTypesMap } from './buildingConfig';
import {
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
  | 'whole_house'
  | 'custom';

export interface MistriDetails {
  /** Multi-select — at least one civil work type. */
  civilWorkTypes: MistriCivilWorkType[];
  /** Required when civilWorkTypes includes plastering. */
  plasterSide?: MistriPlasterSide | null;
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
  contractType: MistriContractType;
  projectStartTimeType: MistriStartTimeType;
  /** ISO date YYYY-MM-DD when projectStartTimeType === 'specific' */
  projectStartTimeSpecificDate?: string | null;
  additionalRequirements?: string | null;
}

export const MISTRI_CIVIL_WORK_OPTIONS: {
  value: MistriCivilWorkType;
  label: string;
}[] = [
  { value: 'brickwork_aac', label: 'Brickwork / AAC Block Masonry' },
  { value: 'plastering', label: 'Plastering Work' },
  {
    value: 'foundation_concrete_structure',
    label: 'Foundation & Concrete Structure (PCC / RCC Column, Beam & Slab)',
  },
  {
    value: 'tile_marble_flooring',
    label: 'Flooring Work (Tiles / Marble / Granites Laying)',
  },
  { value: 'boundary_wall_fencing', label: 'Boundary Wall / Fencing Work' },
  {
    value: 'complete_full_structure',
    label: 'Complete Full Structure (Foundation to Plastering)',
  },
];

/**
 * Structural options covered by Complete Full Structure.
 * Flooring remains independently selectable alongside full structure.
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

/** Enforce full-structure exclusivity (keeps flooring). */
export function normalizeMistriCivilWorkSelection(
  types: readonly MistriCivilWorkType[],
): MistriCivilWorkType[] {
  const unique: MistriCivilWorkType[] = [];
  for (const t of types) {
    if (!unique.includes(t)) unique.push(t);
  }
  if (!unique.includes('complete_full_structure')) return unique;
  return unique.filter(
    (t) => t === 'complete_full_structure' || t === 'tile_marble_flooring',
  );
}

/**
 * Toggle civil work with Full Structure rules:
 * - Selecting full structure clears structural options (flooring kept).
 * - Selecting a structural option while full structure is active clears full structure.
 */
export function toggleMistriCivilWorkType(
  current: readonly MistriCivilWorkType[],
  value: MistriCivilWorkType,
): MistriCivilWorkType[] {
  const has = current.includes(value);
  const isStructural = (MISTRI_STRUCTURAL_CIVIL_WORK as readonly string[]).includes(value);

  if (value === 'complete_full_structure') {
    if (has) {
      return current.filter((t) => t !== 'complete_full_structure');
    }
    const kept = current.filter(
      (t) =>
        t !== 'complete_full_structure' &&
        !(MISTRI_STRUCTURAL_CIVIL_WORK as readonly string[]).includes(t),
    );
    return normalizeMistriCivilWorkSelection([...kept, 'complete_full_structure']);
  }

  if (isStructural) {
    if (has) {
      return current.filter((t) => t !== value);
    }
    return [...current.filter((t) => t !== 'complete_full_structure'), value];
  }

  // Flooring (and any other non-structural) — independent of full structure
  if (has) return current.filter((t) => t !== value);
  return [...current, value];
}

export const MISTRI_PLASTER_SIDE_OPTIONS: {
  value: MistriPlasterSide;
  label: string;
}[] = [
  { value: 'single', label: 'Single Side Plaster' },
  { value: 'both', label: 'Both Side Plaster' },
];

/** Current construction floor buttons (Box 1). */
export const MISTRI_CURRENT_FLOOR_OPTIONS: {
  value: MistriCurrentFloorOption;
  label: string;
}[] = [
  { value: 'G+0', label: 'Ground Floor Only (G Only / Single Story)' },
  { value: 'G+1', label: 'G+1 (Ground + 1 Floor)' },
  { value: 'G+2', label: 'G+2 (Ground + 2 Floors)' },
  { value: 'custom', label: 'Custom (Manual Entry)' },
];

/** Future foundation expansion dropdown options (Box 2). */
export const MISTRI_FUTURE_FLOOR_OPTIONS: {
  value: MistriFutureFloorOption;
  label: string;
}[] = [
  { value: 'same', label: 'Same as current project' },
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
  { value: 'G+0', label: 'Ground Floor Only (G Only / Single Story)' },
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
  { value: 'whole_house', label: 'Whole House / Entire Frame' },
  { value: 'custom', label: 'Custom Floor(s)' },
];

export const MISTRI_CONTRACT_TYPE_OPTIONS: {
  value: MistriContractType;
  label: string;
}[] = [
  { value: 'labor_only', label: 'Labor Rate Only' },
  { value: 'labor_centering', label: 'Labor + Centering/Shuttering' },
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

export const CUSTOM_FLOOR_PLAN_INVALID_MESSAGE =
  'Please enter an accurate floor plan value.';

export const FOUNDATION_CAPACITY_INVALID_MESSAGE =
  'Future foundation plan must be equal to or greater than current build floors.';

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
const START_TIME_TYPES = new Set<MistriStartTimeType>([
  '1week',
  '2week',
  '1month',
  'specific',
]);

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
    const normalized = normalizeFloorPlanValue(customValue);
    if (!normalized) {
      return { error: CUSTOM_FLOOR_PLAN_INVALID_MESSAGE };
    }
    return { value: normalized };
  }
  return { value: option };
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

export function isMistriDetails(value: unknown): value is MistriDetails {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const civilWorkTypes = normalizeCivilWorkTypes(v.civilWorkTypes);
  const contractType = normalizeContractType(v.contractType);
  const { currentFloorPlan, futureFloorPlan, floorLevel } = extractFloorPlans(v);
  const floorRequired = mistriFloorLevelRequired(civilWorkTypes);
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
    contractType == null ||
    typeof v.projectStartTimeType !== 'string' ||
    !START_TIME_TYPES.has(v.projectStartTimeType as MistriStartTimeType) ||
    !additionalOk
  ) {
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

export function parseMistriDetails(value: unknown): MistriDetails | null {
  if (!value || typeof value !== 'object') return null;
  if (!isMistriDetails(value)) return null;

  const raw = value as unknown as Record<string, unknown>;
  const civilWorkTypes = normalizeCivilWorkTypes(raw.civilWorkTypes);
  const contractType = normalizeContractType(raw.contractType);
  const { currentFloorPlan, futureFloorPlan, floorLevel, customFloorCount } =
    extractFloorPlans(raw);
  const floorRequired = mistriFloorLevelRequired(civilWorkTypes);
  if (civilWorkTypes.length === 0 || !contractType) return null;
  if (floorRequired && (!currentFloorPlan || !futureFloorPlan)) return null;

  const plasterSide = civilWorkTypes.includes('plastering')
    ? normalizePlasterSide(raw.plasterSide)
    : null;

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

  const approximateAreaSqft =
    typeof raw.approximateAreaSqft === 'number' ? raw.approximateAreaSqft : NaN;
  if (!Number.isFinite(approximateAreaSqft) || approximateAreaSqft <= 0) return null;

  return {
    civilWorkTypes,
    plasterSide,
    approximateAreaSqft,
    currentFloorPlan,
    futureFloorPlan,
    workAreaFloors,
    workAreaCustomFloors,
    floorLevel: floorLevel ?? null,
    customFloorCount:
      floorLevel === 'custom' ? (customFloorCount ?? 3) : null,
    contractType,
    projectStartTimeType,
    projectStartTimeSpecificDate: specific,
    additionalRequirements,
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
      return `${fullLabel} with Flooring Work (Tiles / Marble / Granites Laying)`;
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
  const blocks: { label: string; value: string }[] = [
    {
      label: 'Civil Work Type',
      value: formatMistriCivilWorkTypes(details),
    },
    {
      label: 'Approx. Area',
      value: formatMistriArea(details.approximateAreaSqft),
    },
  ];

  if (details.currentFloorPlan || details.futureFloorPlan) {
    blocks.push({
      label: 'Current Build Floors',
      value: formatMistriFloorPlan(details.currentFloorPlan),
    });
    blocks.push({
      label: 'Future Foundation Expansion',
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

  blocks.push(
    {
      label: 'Contract Type',
      value: optionLabel(MISTRI_CONTRACT_TYPE_OPTIONS, details.contractType),
    },
    {
      label: 'Start Time',
      value: formatMistriStartTime(details),
    },
  );

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

/** Derive construction_types from civil work selection + floor plan. */
export function constructionTypesFromMistriDetails(
  details: MistriDetails,
): ConstructionTypesMap {
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

export function validateMistriDetailsInput(input: {
  civilWorkTypes: MistriCivilWorkType[];
  plasterSide: MistriPlasterSide | null;
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
  );
  if (civilWorkTypes.length === 0) {
    return { error: 'Select at least one type of civil work.' };
  }

  let plasterSide: MistriPlasterSide | null = null;
  if (civilWorkTypes.includes('plastering')) {
    if (!input.plasterSide || !PLASTER_SIDE_SET.has(input.plasterSide)) {
      return { error: 'Select Single Side or Both Side plaster.' };
    }
    plasterSide = input.plasterSide;
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
        futureResolved.error === CUSTOM_FLOOR_PLAN_INVALID_MESSAGE
      ) {
        return { error: CUSTOM_FLOOR_PLAN_INVALID_MESSAGE };
      }
      return { error: 'Select your future expansion plan for the foundation.' };
    }

    currentFloorPlan = currentResolved.value;
    futureFloorPlan = futureResolved.value;

    const currentN = floorPlanUpperCount(currentFloorPlan);
    const futureN = floorPlanUpperCount(futureFloorPlan);
    if (currentN == null || futureN == null) {
      return { error: CUSTOM_FLOOR_PLAN_INVALID_MESSAGE };
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

  if (!input.contractType || !CONTRACT_SET.has(input.contractType)) {
    return { error: 'Select a contract type.' };
  }

  if (!input.projectStartTimeType || !START_TIME_TYPES.has(input.projectStartTimeType)) {
    return { error: 'Select when the project should start.' };
  }

  const additional = input.additionalRequirements.trim() || null;

  const base: Omit<MistriDetails, 'projectStartTimeType' | 'projectStartTimeSpecificDate'> = {
    civilWorkTypes,
    plasterSide,
    approximateAreaSqft: area,
    currentFloorPlan,
    futureFloorPlan,
    workAreaFloors,
    workAreaCustomFloors,
    floorLevel: null,
    customFloorCount: null,
    contractType: input.contractType,
    additionalRequirements: additional,
  };

  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: 'Select a specific project start date.' };
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

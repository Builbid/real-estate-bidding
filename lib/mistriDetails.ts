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

export type MistriFloorLevel = 'ground' | '1st' | '2nd' | 'custom';

export type MistriContractType =
  | 'labor_only'
  | 'labor_centering';

/** Legacy contract type no longer collected on the form. */
type LegacyMistriContractType = 'full_material_labor';

export type MistriStartTimeType = '1week' | '2week' | '1month' | 'specific';

export interface MistriDetails {
  /** Multi-select — at least one civil work type. */
  civilWorkTypes: MistriCivilWorkType[];
  /** Required when civilWorkTypes includes plastering. */
  plasterSide?: MistriPlasterSide | null;
  /** Approximate project area in sq.ft. (rough estimate is fine). */
  approximateAreaSqft: number;
  floorLevel: MistriFloorLevel;
  /** Required when floorLevel === 'custom' — exact total floors (e.g. 4, 5, 6). */
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

export const MISTRI_PLASTER_SIDE_OPTIONS: {
  value: MistriPlasterSide;
  label: string;
}[] = [
  { value: 'single', label: 'Single Side Plaster' },
  { value: 'both', label: 'Both Side Plaster' },
];

export const MISTRI_FLOOR_LEVEL_OPTIONS: {
  value: MistriFloorLevel;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: '1st', label: '1st Floor' },
  { value: '2nd', label: '2nd Floor' },
  { value: 'custom', label: '3+ Floors (Specify Exact)' },
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

const CIVIL_WORK_SET = new Set<string>(MISTRI_CIVIL_WORK_OPTIONS.map((o) => o.value));
const FLOOR_SET = new Set<string>(MISTRI_FLOOR_LEVEL_OPTIONS.map((o) => o.value));
const CONTRACT_SET = new Set<string>(MISTRI_CONTRACT_TYPE_OPTIONS.map((o) => o.value));
const PLASTER_SIDE_SET = new Set<string>(MISTRI_PLASTER_SIDE_OPTIONS.map((o) => o.value));
const START_TIME_TYPES = new Set<MistriStartTimeType>([
  '1week',
  '2week',
  '1month',
  'specific',
]);

const MIN_CUSTOM_FLOORS = 3;
const MAX_CUSTOM_FLOORS = 50;

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

function normalizeFloorLevel(value: unknown): MistriFloorLevel | null {
  if (typeof value !== 'string') return null;
  if (FLOOR_SET.has(value)) return value as MistriFloorLevel;
  if (value === '3rd_above') return 'custom';
  return null;
}

function normalizePlasterSide(value: unknown): MistriPlasterSide | null {
  if (typeof value !== 'string') return null;
  if (PLASTER_SIDE_SET.has(value)) return value as MistriPlasterSide;
  return null;
}

function normalizeCustomFloorCount(
  floorLevel: MistriFloorLevel,
  raw: unknown,
  legacyFloor?: unknown,
): number | null {
  if (floorLevel !== 'custom') return null;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= MIN_CUSTOM_FLOORS) {
    return Math.min(raw, MAX_CUSTOM_FLOORS);
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10);
    if (n >= MIN_CUSTOM_FLOORS) return Math.min(n, MAX_CUSTOM_FLOORS);
  }
  // Legacy rows used 3rd_above without an explicit count.
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
  return normalized;
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

export function isMistriDetails(value: unknown): value is MistriDetails {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const civilWorkTypes = normalizeCivilWorkTypes(v.civilWorkTypes);
  const contractType = normalizeContractType(v.contractType);
  const floorLevel = normalizeFloorLevel(v.floorLevel);
  const additionalOk =
    v.additionalRequirements === undefined ||
    v.additionalRequirements === null ||
    typeof v.additionalRequirements === 'string';

  if (
    civilWorkTypes.length === 0 ||
    typeof v.approximateAreaSqft !== 'number' ||
    !Number.isFinite(v.approximateAreaSqft) ||
    v.approximateAreaSqft <= 0 ||
    !floorLevel ||
    contractType == null ||
    typeof v.projectStartTimeType !== 'string' ||
    !START_TIME_TYPES.has(v.projectStartTimeType as MistriStartTimeType) ||
    !additionalOk
  ) {
    return false;
  }

  if (civilWorkTypes.includes('plastering')) {
    const side = normalizePlasterSide(v.plasterSide);
    // Legacy rows may omit plasterSide — allow parse to fill null for display.
    if (v.plasterSide != null && !side) return false;
  }

  if (floorLevel === 'custom') {
    const count = normalizeCustomFloorCount(floorLevel, v.customFloorCount, v.floorLevel);
    // Accept legacy 3rd_above without count during is-check via normalizeFloorLevel path:
    // when raw floorLevel is still '3rd_above', normalizeFloorLevel returns custom but
    // customFloorCount may be missing — still treat as valid for parse.
    if (v.floorLevel === 'custom' && count == null) return false;
  }

  return true;
}

export function parseMistriDetails(value: unknown): MistriDetails | null {
  if (!value || typeof value !== 'object') return null;
  if (!isMistriDetails(value)) return null;

  // Re-read via unknown so legacy keys (e.g. floorLevel: '3rd_above') can be normalized.
  const raw = value as unknown as Record<string, unknown>;
  const civilWorkTypes = normalizeCivilWorkTypes(raw.civilWorkTypes);
  const contractType = normalizeContractType(raw.contractType);
  const floorLevel = normalizeFloorLevel(raw.floorLevel);
  if (civilWorkTypes.length === 0 || !contractType || !floorLevel) return null;

  const plasterSide = civilWorkTypes.includes('plastering')
    ? normalizePlasterSide(raw.plasterSide)
    : null;

  const customFloorCount = normalizeCustomFloorCount(
    floorLevel,
    raw.customFloorCount,
    raw.floorLevel,
  );

  if (floorLevel === 'custom' && customFloorCount == null && raw.floorLevel !== '3rd_above') {
    return null;
  }

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

  return {
    civilWorkTypes,
    plasterSide,
    approximateAreaSqft,
    floorLevel,
    customFloorCount: floorLevel === 'custom' ? (customFloorCount ?? 3) : null,
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
  return details.civilWorkTypes
    .map((t) => {
      if (t === 'plastering') {
        if (details.plasterSide === 'single') return 'Plastering Work (Single Side)';
        if (details.plasterSide === 'both') return 'Plastering Work (Both Side)';
        return 'Plastering Work';
      }
      return optionLabel(MISTRI_CIVIL_WORK_OPTIONS, t);
    })
    .join(', ');
}

export function formatMistriFloorLevel(details: MistriDetails): string {
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
    {
      label: 'Floor Level',
      value: formatMistriFloorLevel(details),
    },
    {
      label: 'Contract Type',
      value: optionLabel(MISTRI_CONTRACT_TYPE_OPTIONS, details.contractType),
    },
    {
      label: 'Start Time',
      value: formatMistriStartTime(details),
    },
  ];

  if (details.additionalRequirements) {
    blocks.push({
      label: 'Additional Notes',
      value: details.additionalRequirements,
    });
  }

  return blocks;
}

/**
 * Map floor level → legacy building_types for DB / bidding compatibility.
 * Custom counts expand ground→upper RCC floors (capped at available RCC types).
 */
export function buildingTypesFromMistriFloor(
  floor: MistriFloorLevel,
  customFloorCount?: number | null,
): BuildingType[] {
  switch (floor) {
    case 'ground':
      return ['RCC Ground Floor'];
    case '1st':
      return ['RCC 1st Floor'];
    case '2nd':
      return ['RCC 2nd Floor'];
    case 'custom': {
      const n = Math.max(MIN_CUSTOM_FLOORS, Math.min(customFloorCount ?? 3, RCC_BUILDING_TYPES.length));
      return RCC_BUILDING_TYPES.slice(0, n);
    }
    default:
      return ['RCC Ground Floor'];
  }
}

/** Derive construction_types from civil work selection + floor. */
export function constructionTypesFromMistriDetails(
  details: MistriDetails,
): ConstructionTypesMap {
  const buildingTypes = buildingTypesFromMistriFloor(
    details.floorLevel,
    details.customFloorCount,
  );
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
  floorLevel: MistriFloorLevel | null;
  customFloorCount: string | number;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}): { error: string } | { details: MistriDetails } {
  const civilWorkTypes = input.civilWorkTypes.filter(
    (t, i, arr) => CIVIL_WORK_SET.has(t) && arr.indexOf(t) === i,
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

  if (!input.floorLevel || !FLOOR_SET.has(input.floorLevel)) {
    return { error: 'Select a floor / height level.' };
  }

  let customFloorCount: number | null = null;
  if (input.floorLevel === 'custom') {
    const raw =
      typeof input.customFloorCount === 'number'
        ? input.customFloorCount
        : parseInt(String(input.customFloorCount).trim(), 10);
    if (!Number.isInteger(raw) || raw < MIN_CUSTOM_FLOORS || raw > MAX_CUSTOM_FLOORS) {
      return {
        error: `Enter total number of floors (${MIN_CUSTOM_FLOORS}–${MAX_CUSTOM_FLOORS}).`,
      };
    }
    customFloorCount = raw;
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
    floorLevel: input.floorLevel,
    customFloorCount,
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

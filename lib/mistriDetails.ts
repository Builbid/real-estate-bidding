// ============================================================
// Mistri Contractor work requirements — stored as projects.mistri_details
// ============================================================

import type { BuildingType, ConstructionTypesMap } from './buildingConfig';
import {
  CONSTRUCTION_TYPE_FULL,
  CONSTRUCTION_TYPE_GROUND,
  CONSTRUCTION_TYPE_UPPER,
} from './buildingConfig';

export type MistriCivilWorkType =
  | 'brickwork_aac'
  | 'plastering'
  | 'rcc_column_beam_slab'
  | 'foundation_pcc'
  | 'tile_marble_flooring'
  | 'boundary_wall_fencing'
  | 'complete_full_structure';

export type MistriFloorLevel = 'ground' | '1st' | '2nd' | '3rd_above';

export type MistriContractType =
  | 'labor_only'
  | 'labor_centering'
  | 'full_material_labor';

export type MistriStartTimeType = '1week' | '2week' | '1month' | 'specific';

export interface MistriDetails {
  /** Multi-select — at least one civil work type. */
  civilWorkTypes: MistriCivilWorkType[];
  /** Approximate project area in sq.ft. (rough estimate is fine). */
  approximateAreaSqft: number;
  floorLevel: MistriFloorLevel;
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
  { value: 'plastering', label: 'Plastering Work (Internal / External)' },
  { value: 'rcc_column_beam_slab', label: 'RCC Column, Beam & Slab Casting' },
  { value: 'foundation_pcc', label: 'Foundation / PCC Work' },
  { value: 'tile_marble_flooring', label: 'Tile / Marble / Flooring Laying' },
  { value: 'boundary_wall_fencing', label: 'Boundary Wall / Fencing Work' },
  { value: 'complete_full_structure', label: 'Complete Full Structure (Civil Frame)' },
];

export const MISTRI_FLOOR_LEVEL_OPTIONS: {
  value: MistriFloorLevel;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: '1st', label: '1st Floor' },
  { value: '2nd', label: '2nd Floor' },
  { value: '3rd_above', label: '3rd Floor & Above' },
];

export const MISTRI_CONTRACT_TYPE_OPTIONS: {
  value: MistriContractType;
  label: string;
}[] = [
  { value: 'labor_only', label: 'Labor Rate Only' },
  { value: 'labor_centering', label: 'Labor + Centering/Shuttering' },
  { value: 'full_material_labor', label: 'Full Material + Labor' },
];

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
const START_TIME_TYPES = new Set<MistriStartTimeType>([
  '1week',
  '2week',
  '1month',
  'specific',
]);

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
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
  const typesOk =
    Array.isArray(v.civilWorkTypes) &&
    v.civilWorkTypes.length > 0 &&
    v.civilWorkTypes.every((t) => typeof t === 'string' && CIVIL_WORK_SET.has(t));
  const additionalOk =
    v.additionalRequirements === undefined ||
    v.additionalRequirements === null ||
    typeof v.additionalRequirements === 'string';

  return (
    typesOk &&
    typeof v.approximateAreaSqft === 'number' &&
    Number.isFinite(v.approximateAreaSqft) &&
    v.approximateAreaSqft > 0 &&
    typeof v.floorLevel === 'string' &&
    FLOOR_SET.has(v.floorLevel) &&
    typeof v.contractType === 'string' &&
    CONTRACT_SET.has(v.contractType) &&
    typeof v.projectStartTimeType === 'string' &&
    START_TIME_TYPES.has(v.projectStartTimeType as MistriStartTimeType) &&
    additionalOk
  );
}

export function parseMistriDetails(value: unknown): MistriDetails | null {
  if (!isMistriDetails(value)) return null;

  const specific =
    value.projectStartTimeType === 'specific' &&
    typeof value.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.projectStartTimeSpecificDate)
      ? value.projectStartTimeSpecificDate
      : null;

  const additionalRequirements =
    typeof value.additionalRequirements === 'string' && value.additionalRequirements.trim()
      ? value.additionalRequirements.trim()
      : null;

  const civilWorkTypes = value.civilWorkTypes.filter(
    (t, i, arr) => CIVIL_WORK_SET.has(t) && arr.indexOf(t) === i,
  ) as MistriCivilWorkType[];

  if (civilWorkTypes.length === 0) return null;

  return {
    civilWorkTypes,
    approximateAreaSqft: value.approximateAreaSqft,
    floorLevel: value.floorLevel,
    contractType: value.contractType,
    projectStartTimeType: value.projectStartTimeType,
    projectStartTimeSpecificDate: specific,
    additionalRequirements,
  };
}

export function formatMistriArea(area: number): string {
  return `Approx. ${area.toLocaleString('en-IN')} Sq. Ft.`;
}

export function formatMistriCivilWorkTypes(types: MistriCivilWorkType[]): string {
  return types.map((t) => optionLabel(MISTRI_CIVIL_WORK_OPTIONS, t)).join(', ');
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
      value: formatMistriCivilWorkTypes(details.civilWorkTypes),
    },
    {
      label: 'Approx. Area',
      value: formatMistriArea(details.approximateAreaSqft),
    },
    {
      label: 'Floor Level',
      value: optionLabel(MISTRI_FLOOR_LEVEL_OPTIONS, details.floorLevel),
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

/** Map floor level → legacy building_types for DB / bidding compatibility. */
export function buildingTypesFromMistriFloor(floor: MistriFloorLevel): BuildingType[] {
  switch (floor) {
    case 'ground':
      return ['RCC Ground Floor'];
    case '1st':
      return ['RCC 1st Floor'];
    case '2nd':
      return ['RCC 2nd Floor'];
    case '3rd_above':
      return ['RCC 3rd Floor'];
    default:
      return ['RCC Ground Floor'];
  }
}

/** Derive construction_types from civil work selection + floor. */
export function constructionTypesFromMistriDetails(
  details: MistriDetails,
): ConstructionTypesMap {
  const buildingTypes = buildingTypesFromMistriFloor(details.floorLevel);
  const isFull =
    details.civilWorkTypes.includes('complete_full_structure') ||
    details.contractType === 'full_material_labor';

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
  approximateArea: string | number;
  floorLevel: MistriFloorLevel | null;
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

  const area = parseApproximateAreaSqft(input.approximateArea);
  if (area == null) {
    return { error: 'Enter an approximate project area in sq.ft. (rough estimate is fine).' };
  }

  if (!input.floorLevel || !FLOOR_SET.has(input.floorLevel)) {
    return { error: 'Select a floor / height level.' };
  }

  if (!input.contractType || !CONTRACT_SET.has(input.contractType)) {
    return { error: 'Select a contract type.' };
  }

  if (!input.projectStartTimeType || !START_TIME_TYPES.has(input.projectStartTimeType)) {
    return { error: 'Select when the project should start.' };
  }

  const additional = input.additionalRequirements.trim() || null;

  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: 'Select a specific project start date.' };
    }
    return {
      details: {
        civilWorkTypes,
        approximateAreaSqft: area,
        floorLevel: input.floorLevel,
        contractType: input.contractType,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
        additionalRequirements: additional,
      },
    };
  }

  return {
    details: {
      civilWorkTypes,
      approximateAreaSqft: area,
      floorLevel: input.floorLevel,
      contractType: input.contractType,
      projectStartTimeType: input.projectStartTimeType,
      projectStartTimeSpecificDate: null,
      additionalRequirements: additional,
    },
  };
}

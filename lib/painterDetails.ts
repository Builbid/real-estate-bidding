// ============================================================
// Painter-only work requirements — stored as projects.painter_details
// ============================================================

import {
  formatProjectStartTime,
  isProjectStartDateWithinRange,
  PROJECT_START_DATE_RANGE_INVALID_MESSAGE,
  PROJECT_START_TIME_OPTIONS,
  type ProjectStartTimeType,
} from './projectStartTime';
import { parseCustomFloorSequence } from './mistriDetails';
import { formatCustomFloorsList } from './customFloors';
import { readNestedProjectDetail } from './project/storedDetails';

export type PainterStartTimeType = ProjectStartTimeType;

/** Legacy start-time values that may exist on older painter_details rows. */
type LegacyPainterStartTimeType = 'immediately';

export type PainterPrimerRequirement = '1 Coat' | '2 Coats' | 'None' | '3 Coats';

export type PainterPaintingScope = 'interior' | 'exterior' | 'both';

/** Legacy finish values that may exist on older painter_details rows. */
export type PainterPaintFinish = 'standard' | 'premium' | 'textured';

export type PainterSurfaceCondition = 'new' | 'repaint';

/** Legacy surface values that may exist on older painter_details rows. */
type LegacyPainterSurfaceCondition = 'repaint_good' | 'repaint_repair';

export type PainterPaintTopcoats = '1 Coat' | '2 Coats' | '3 Coats';

export type PainterPuttyRequirement = '1 Coat' | '2 Coats' | 'None';

export type PainterTargetFloor = 'ground' | 'first' | 'second' | 'third' | 'fourth' | 'custom';

export interface PainterDetails {
  projectArea: number;
  primerRequirement: PainterPrimerRequirement;
  /**
   * Optional / legacy. true = without material (client provides);
   * false = with material (contractor provides); null = not collected.
   */
  materialsIncludeClient?: boolean | null;
  projectStartTimeType: PainterStartTimeType;
  /** ISO date YYYY-MM-DD when projectStartTimeType === 'specific' */
  projectStartTimeSpecificDate?: string | null;
  /** New painter work-requirement fields (optional on legacy rows). */
  paintingScope?: PainterPaintingScope | null;
  paintFinish?: PainterPaintFinish | null;
  surfaceCondition?: PainterSurfaceCondition | null;
  paintTopcoats?: PainterPaintTopcoats | null;
  puttyRequirement?: PainterPuttyRequirement | null;
  additionalRequirements?: string | null;
  /** RCC floors to paint. Empty / omitted for Assam Type and legacy rows. */
  targetFloors?: PainterTargetFloor[] | null;
  customTargetFloors?: number[] | null;
  /** Carpet / floor area used to auto-estimate paint area. */
  carpetArea?: number | null;
}

export const PAINTER_PRIMER_OPTIONS: {
  value: Extract<PainterPrimerRequirement, '1 Coat' | '2 Coats'>;
  label: string;
}[] = [
  { value: '1 Coat', label: '1 Coat' },
  { value: '2 Coats', label: '2 Coats' },
];

export const PAINTER_PUTTY_OPTIONS: {
  value: PainterPuttyRequirement;
  label: string;
}[] = [
  { value: '1 Coat', label: '1st Layer Putty (Single Putty)' },
  { value: '2 Coats', label: '2nd Layer Putty (Double Putty)' },
  { value: 'None', label: 'No Putty Required' },
];

export const PAINTER_SCOPE_OPTIONS: {
  value: PainterPaintingScope;
  label: string;
}[] = [
  { value: 'both', label: 'Interior & Exterior Both' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
];

export const PAINTER_PAINT_AREA_MULTIPLIERS: Record<PainterPaintingScope, number> = {
  interior: 2.8,
  exterior: 1.5,
  both: 4.3,
};

export const PAINTER_PAINT_AREA_DISCLAIMER =
  'Note: This is an auto-generated approximate paint area based on standard multipliers to help painters place bids. Final payable measurements will be physically verified on-site before work commences.';

/** Count RCC work floors, treating each custom floor number as its own floor. */
export function countPainterSelectedFloors(
  targetFloors?: PainterTargetFloor[] | null,
  customTargetFloors?: number[] | null,
): number {
  if (!targetFloors?.length) return 0;
  let count = 0;
  for (const floor of targetFloors) {
    if (floor === 'custom') {
      count += customTargetFloors?.length ?? 0;
    } else {
      count += 1;
    }
  }
  return count;
}

/** Floor-area multiplier: selected floors, or 1 when none are chosen yet. */
export function painterFloorAreaMultiplier(
  targetFloors?: PainterTargetFloor[] | null,
  customTargetFloors?: number[] | null,
): number {
  return Math.max(countPainterSelectedFloors(targetFloors, customTargetFloors), 1);
}

export function resolvePainterTotalFloorArea(
  singleFloorArea: number,
  floorCount: number,
): number {
  if (!Number.isFinite(singleFloorArea) || singleFloorArea <= 0) return 0;
  return singleFloorArea * Math.max(floorCount, 1);
}

export function formatPainterTotalFloorAreaSummary(
  singleFloorArea: number,
  floorCount: number,
): string | null {
  if (floorCount <= 1 || !(singleFloorArea > 0)) return null;
  const area = singleFloorArea.toLocaleString('en-IN');
  const total = resolvePainterTotalFloorArea(singleFloorArea, floorCount).toLocaleString('en-IN');
  return `Calculated Total Floor Area: ${area} Sq. Ft. × ${floorCount} Selected Floors = ${total} Sq. Ft.`;
}

export function estimatePainterPaintArea(
  carpetArea: number,
  scope: PainterPaintingScope,
  floorCount = 1,
): number {
  const totalFloorArea = resolvePainterTotalFloorArea(carpetArea, floorCount);
  return Math.round(totalFloorArea * PAINTER_PAINT_AREA_MULTIPLIERS[scope]);
}

export function parsePainterAreaInput(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const value = parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

const LEGACY_FINISH_SET = new Set<string>(['standard', 'premium', 'textured']);

export const PAINTER_SURFACE_OPTIONS: {
  value: PainterSurfaceCondition;
  label: string;
}[] = [
  { value: 'new', label: 'New Surface' },
  { value: 'repaint', label: 'Repaint' },
];

export const PAINTER_TOPCOAT_OPTIONS: PainterPaintTopcoats[] = [
  '1 Coat',
  '2 Coats',
];

export const PAINTER_START_TIME_OPTIONS = PROJECT_START_TIME_OPTIONS;

const START_TIME_TYPES = new Set<PainterStartTimeType>([
  '1week',
  '2week',
  '1month',
  'specific',
]);

const LEGACY_START_TIME_MAP: Record<LegacyPainterStartTimeType, PainterStartTimeType> = {
  immediately: '1week',
};

const PRIMER_SET = new Set<string>(PAINTER_PRIMER_OPTIONS.map((o) => o.value));
const STORED_PRIMER_SET = new Set<string>([...PRIMER_SET, 'None', '3 Coats']);
const SCOPE_SET = new Set<string>(PAINTER_SCOPE_OPTIONS.map((o) => o.value));
const SURFACE_SET = new Set<string>(PAINTER_SURFACE_OPTIONS.map((o) => o.value));
const LEGACY_SURFACE_MAP: Record<LegacyPainterSurfaceCondition, PainterSurfaceCondition> = {
  repaint_good: 'repaint',
  repaint_repair: 'repaint',
};
const TOPCOAT_SET = new Set<string>(PAINTER_TOPCOAT_OPTIONS);
const STORED_TOPCOAT_SET = new Set<string>([...TOPCOAT_SET, '3 Coats']);
const PUTTY_SET = new Set<string>(PAINTER_PUTTY_OPTIONS.map((o) => o.value));
const TARGET_FLOOR_SET = new Set<PainterTargetFloor>([
  'ground',
  'first',
  'second',
  'third',
  'fourth',
  'custom',
]);
const TARGET_FLOOR_LABELS: Record<PainterTargetFloor, string> = {
  ground: 'RCC Ground Floor',
  first: 'RCC 1st Floor',
  second: 'RCC 2nd Floor',
  third: 'RCC 3rd Floor',
  fourth: 'RCC 4th Floor',
  custom: 'Custom floors',
};

function parsePainterTargetFloors(raw: unknown): PainterTargetFloor[] {
  if (!Array.isArray(raw)) return [];
  const next: PainterTargetFloor[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && TARGET_FLOOR_SET.has(item as PainterTargetFloor)) {
      const floor = item as PainterTargetFloor;
      if (!next.includes(floor)) next.push(floor);
    }
  }
  return next;
}

function parsePainterCustomFloors(raw: unknown): number[] | null {
  const floors = parseCustomFloorSequence(raw, { allowGaps: true });
  return floors && floors.length > 0 ? floors : null;
}

function formatPainterTargetFloors(
  floors: PainterTargetFloor[] | null | undefined,
  customFloors?: number[] | null,
): string {
  if (!floors?.length) return '';
  return floors
    .map((floor) =>
      floor === 'custom' && formatCustomFloorsList(customFloors)
        ? formatCustomFloorsList(customFloors)
        : TARGET_FLOOR_LABELS[floor],
    )
    .join(', ');
}

const PAINTER_BID_FLOOR_LABELS: Record<Exclude<PainterTargetFloor, 'custom'>, string> = {
  ground: 'Ground Floor',
  first: '1st Floor',
  second: '2nd Floor',
  third: '3rd Floor',
  fourth: '4th Floor',
};

const PAINTER_BID_FLOOR_ORDER: PainterTargetFloor[] = [
  'ground',
  'first',
  'second',
  'third',
  'fourth',
  'custom',
];

function ordinalFloorLabel(n: number): string {
  const abs = Math.abs(n);
  const j = abs % 10;
  const k = abs % 100;
  const suffix =
    j === 1 && k !== 11 ? 'st' : j === 2 && k !== 12 ? 'nd' : j === 3 && k !== 13 ? 'rd' : 'th';
  return `${n}${suffix} Floor`;
}

export interface PainterBidFloor {
  id: string;
  floor: PainterTargetFloor;
  label: string;
  rateLabel: string;
  /** Carpet / floor area applied to this floor for estimated cost. */
  areaSqft: number;
}

/** Area used for each selected work floor when computing estimated painting cost. */
export function resolvePainterFloorAreaSqft(
  details: PainterDetails | null | undefined,
  floorCount = 1,
  fallbackArea?: number | null,
): number {
  if (details?.carpetArea && details.carpetArea > 0) return details.carpetArea;
  if (fallbackArea && fallbackArea > 0) return fallbackArea;
  if (details?.projectArea && details.projectArea > 0) {
    const n = Math.max(floorCount, 1);
    return n > 1 ? details.projectArea / n : details.projectArea;
  }
  return 0;
}

export function readPainterBidFloors(project: {
  service_type?: string | null;
  painter_details?: unknown;
  sub_configuration?: unknown;
  floor_area_sqft?: number | null;
}): PainterBidFloor[] {
  const details = parsePainterDetails(readNestedProjectDetail(project, 'painter_details'));
  if (!details?.targetFloors?.length) return [];

  const selected = new Set(details.targetFloors);
  const floors: Omit<PainterBidFloor, 'areaSqft'>[] = [];
  for (const key of PAINTER_BID_FLOOR_ORDER) {
    if (!selected.has(key)) continue;
    if (key === 'custom') {
      for (const n of details.customTargetFloors ?? []) {
        const label = ordinalFloorLabel(n);
        floors.push({
          id: `custom-${n}`,
          floor: 'custom',
          label,
          rateLabel: `${label} Rate (/sqft)`,
        });
      }
      continue;
    }
    const label = PAINTER_BID_FLOOR_LABELS[key];
    floors.push({
      id: key,
      floor: key,
      label,
      rateLabel: `${label} Rate (/sqft)`,
    });
  }
  const areaSqft = resolvePainterFloorAreaSqft(
    details,
    floors.length,
    project.floor_area_sqft,
  );
  return floors.map((floor) => ({ ...floor, areaSqft }));
}

function normalizeStartTimeType(value: unknown): PainterStartTimeType | null {
  if (typeof value !== 'string') return null;
  if (START_TIME_TYPES.has(value as PainterStartTimeType)) {
    return value as PainterStartTimeType;
  }
  if (value in LEGACY_START_TIME_MAP) {
    return LEGACY_START_TIME_MAP[value as LegacyPainterStartTimeType];
  }
  return null;
}

function normalizeSurfaceCondition(value: unknown): PainterSurfaceCondition | null {
  if (typeof value !== 'string') return null;
  if (SURFACE_SET.has(value)) return value as PainterSurfaceCondition;
  if (value in LEGACY_SURFACE_MAP) {
    return LEGACY_SURFACE_MAP[value as LegacyPainterSurfaceCondition];
  }
  return null;
}

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function isPainterDetails(value: unknown): value is PainterDetails {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const materialsOk =
    v.materialsIncludeClient === undefined ||
    v.materialsIncludeClient === null ||
    typeof v.materialsIncludeClient === 'boolean';
  const optionalEnumOk = (field: unknown, set: Set<string>) =>
    field === undefined || field === null || (typeof field === 'string' && set.has(field));
  const additionalOk =
    v.additionalRequirements === undefined ||
    v.additionalRequirements === null ||
    typeof v.additionalRequirements === 'string';
  const floorsOk =
    v.targetFloors === undefined ||
    v.targetFloors === null ||
    Array.isArray(v.targetFloors);
  const customFloorsOk =
    v.customTargetFloors === undefined ||
    v.customTargetFloors === null ||
    Array.isArray(v.customTargetFloors) ||
    typeof v.customTargetFloors === 'string';
  const carpetOk =
    v.carpetArea === undefined ||
    v.carpetArea === null ||
    (typeof v.carpetArea === 'number' && Number.isFinite(v.carpetArea) && v.carpetArea > 0);

  return (
    typeof v.projectArea === 'number' &&
    Number.isFinite(v.projectArea) &&
    v.projectArea > 0 &&
    typeof v.primerRequirement === 'string' &&
    STORED_PRIMER_SET.has(v.primerRequirement) &&
    materialsOk &&
    normalizeStartTimeType(v.projectStartTimeType) != null &&
    optionalEnumOk(v.paintingScope, SCOPE_SET) &&
    optionalEnumOk(v.paintFinish, LEGACY_FINISH_SET) &&
    (v.surfaceCondition === undefined ||
      v.surfaceCondition === null ||
      normalizeSurfaceCondition(v.surfaceCondition) != null) &&
    optionalEnumOk(v.paintTopcoats, STORED_TOPCOAT_SET) &&
    optionalEnumOk(v.puttyRequirement, PUTTY_SET) &&
    additionalOk &&
    floorsOk &&
    customFloorsOk &&
    carpetOk
  );
}

export function parsePainterDetails(value: unknown): PainterDetails | null {
  if (!isPainterDetails(value)) return null;
  const projectStartTimeType = normalizeStartTimeType(value.projectStartTimeType);
  if (!projectStartTimeType) return null;
  const specific =
    projectStartTimeType === 'specific' &&
    typeof value.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.projectStartTimeSpecificDate)
      ? value.projectStartTimeSpecificDate
      : null;

  const paintingScope =
    typeof value.paintingScope === 'string' && SCOPE_SET.has(value.paintingScope)
      ? (value.paintingScope as PainterPaintingScope)
      : null;
  const paintFinish =
    typeof value.paintFinish === 'string' && LEGACY_FINISH_SET.has(value.paintFinish)
      ? (value.paintFinish as PainterPaintFinish)
      : null;
  const surfaceCondition = normalizeSurfaceCondition(value.surfaceCondition);
  const paintTopcoats =
    typeof value.paintTopcoats === 'string' && STORED_TOPCOAT_SET.has(value.paintTopcoats)
      ? (value.paintTopcoats as PainterPaintTopcoats)
      : null;
  const puttyRequirement =
    typeof value.puttyRequirement === 'string' && PUTTY_SET.has(value.puttyRequirement)
      ? (value.puttyRequirement as PainterPuttyRequirement)
      : null;
  const additionalRequirements =
    typeof value.additionalRequirements === 'string' && value.additionalRequirements.trim()
      ? value.additionalRequirements.trim()
      : null;

  const targetFloors = parsePainterTargetFloors(value.targetFloors);
  const customTargetFloors = targetFloors.includes('custom')
    ? parsePainterCustomFloors(value.customTargetFloors)
    : null;

  return {
    projectArea: value.projectArea,
    primerRequirement: value.primerRequirement,
    materialsIncludeClient:
      typeof value.materialsIncludeClient === 'boolean'
        ? value.materialsIncludeClient
        : null,
    projectStartTimeType,
    projectStartTimeSpecificDate: specific,
    paintingScope,
    paintFinish,
    surfaceCondition,
    paintTopcoats,
    puttyRequirement,
    additionalRequirements,
    targetFloors: targetFloors.length > 0 ? targetFloors : null,
    customTargetFloors,
    carpetArea:
      typeof value.carpetArea === 'number' && Number.isFinite(value.carpetArea) && value.carpetArea > 0
        ? value.carpetArea
        : null,
  };
}

export function formatPainterProjectArea(area: number): string {
  return `Approx. ${area.toLocaleString('en-IN')} Sq. Ft.`;
}

export function formatPainterPrimer(primer: PainterPrimerRequirement): string {
  if (primer === 'None') return 'No Primer';
  return primer;
}

export function formatPainterPutty(putty: PainterPuttyRequirement): string {
  return optionLabel(PAINTER_PUTTY_OPTIONS, putty);
}

export function formatPainterMaterials(materialsIncludeClient: boolean): string {
  return materialsIncludeClient ? 'Without Material' : 'With Material';
}

export function formatPainterStartTime(details: PainterDetails): string {
  return formatProjectStartTime(details.projectStartTimeType, details.projectStartTimeSpecificDate);
}

export function getPainterWorkRequirementBlocks(details: PainterDetails): {
  label: string;
  value: string;
}[] {
  const blocks: { label: string; value: string }[] = [];

  if (details.targetFloors && details.targetFloors.length > 0) {
    blocks.push({
      label: 'Target Work Floor',
      value: formatPainterTargetFloors(details.targetFloors, details.customTargetFloors),
    });
  }

  if (details.carpetArea && details.carpetArea > 0) {
    blocks.push({
      label: 'Approx. House / Floor Area',
      value: `${details.carpetArea.toLocaleString('en-IN')} Sq. Ft.`,
    });
    const floorCount = countPainterSelectedFloors(details.targetFloors, details.customTargetFloors);
    const totalSummary = formatPainterTotalFloorAreaSummary(details.carpetArea, floorCount);
    if (totalSummary) {
      blocks.push({
        label: 'Calculated Total Floor Area',
        value: `${details.carpetArea.toLocaleString('en-IN')} Sq. Ft. × ${floorCount} Selected Floors = ${resolvePainterTotalFloorArea(details.carpetArea, floorCount).toLocaleString('en-IN')} Sq. Ft.`,
      });
    }
  }

  blocks.push(
    { label: 'Estimated Paint Area', value: formatPainterProjectArea(details.projectArea) },
  );

  if (details.paintingScope) {
    blocks.push({
      label: 'Painting Work Coverage',
      value: optionLabel(PAINTER_SCOPE_OPTIONS, details.paintingScope),
    });
  }
  if (details.surfaceCondition) {
    blocks.push({
      label: 'Condition',
      value: optionLabel(PAINTER_SURFACE_OPTIONS, details.surfaceCondition),
    });
  }

  if (details.puttyRequirement) {
    blocks.push({
      label: 'Wall Putty Requirement',
      value: formatPainterPutty(details.puttyRequirement),
    });
  }

  blocks.push({
    label: 'Primer',
    value: formatPainterPrimer(details.primerRequirement),
  });

  if (details.paintTopcoats) {
    blocks.push({
      label: 'Paint Layers / Final Coats',
      value: details.paintTopcoats.toUpperCase(),
    });
  }

  // Legacy rows only — materials is no longer collected on the form.
  if (typeof details.materialsIncludeClient === 'boolean') {
    blocks.push({
      label: 'Materials',
      value: formatPainterMaterials(details.materialsIncludeClient),
    });
  }

  blocks.push({
      label: 'Work Start Timeline',
    value: formatPainterStartTime(details),
  });

  if (details.additionalRequirements) {
    blocks.push({
      label: 'Additional Requirements',
      value: details.additionalRequirements,
    });
  }

  return blocks;
}

export function validatePainterDetailsInput(input: {
  projectArea: string | number;
  carpetArea?: string | number | null;
  primerRequirement: string;
  puttyRequirement: PainterPuttyRequirement | null;
  projectStartTimeType: PainterStartTimeType | null;
  projectStartTimeSpecificDate: string;
  paintingScope: PainterPaintingScope | null;
  surfaceCondition: PainterSurfaceCondition | null;
  paintTopcoats: PainterPaintTopcoats | null;
  additionalRequirements: string;
  trackType?: 'RCC' | 'AssamType' | null;
  targetFloors?: PainterTargetFloor[];
  customTargetFloors?: number[];
}): { error: string; fieldErrors: Record<string, string> } | { details: PainterDetails } {
  const fieldErrors: Record<string, string> = {};
  const carpetArea = parsePainterAreaInput(input.carpetArea);
  if (!carpetArea) {
    fieldErrors.carpet = 'Enter the approx. house / floor area in sq.ft.';
  }
  const area = parsePainterAreaInput(input.projectArea);
  if (!area) {
    fieldErrors.paintArea = 'Enter a valid estimated paint area in sq.ft.';
  }
  if (!input.paintingScope || !SCOPE_SET.has(input.paintingScope)) {
    fieldErrors.paintingScope = 'Select a painting scope.';
  }
  if (!input.surfaceCondition || !SURFACE_SET.has(input.surfaceCondition)) {
    fieldErrors.surface = 'Select a surface condition.';
  }
  if (!input.puttyRequirement || !PUTTY_SET.has(input.puttyRequirement)) {
    fieldErrors.putty = 'Select a wall putty requirement.';
  }
  if (!PRIMER_SET.has(input.primerRequirement)) {
    fieldErrors.primer = 'Select a primer requirement.';
  }
  if (!input.paintTopcoats || !TOPCOAT_SET.has(input.paintTopcoats)) {
    fieldErrors.topcoats = 'Select the paint layers / final coats.';
  }
  if (!input.projectStartTimeType || !START_TIME_TYPES.has(input.projectStartTimeType)) {
    fieldErrors.start = 'Select when the project should start.';
  }

  const additional = input.additionalRequirements.trim() || null;
  const isRcc = input.trackType === 'RCC';
  const targetFloors = isRcc ? parsePainterTargetFloors(input.targetFloors) : [];
  if (isRcc && targetFloors.length === 0) {
    fieldErrors.floors = 'Select at least one target work floor.';
  }
  const customTargetFloors =
    isRcc && targetFloors.includes('custom')
      ? parsePainterCustomFloors(input.customTargetFloors)
      : null;
  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fieldErrors.date = 'Select a specific project start date.';
    } else if (!isProjectStartDateWithinRange(date)) {
      fieldErrors.date = PROJECT_START_DATE_RANGE_INVALID_MESSAGE;
    }
  }
  if (
    Object.keys(fieldErrors).length > 0 ||
    !carpetArea ||
    !area ||
    !input.paintingScope ||
    !input.surfaceCondition ||
    !input.puttyRequirement ||
    !input.paintTopcoats ||
    !input.projectStartTimeType
  ) {
    return {
      error: Object.values(fieldErrors)[0] ?? 'Painter work requirements are incomplete.',
      fieldErrors,
    };
  }
  const floorFields = {
    targetFloors: targetFloors.length > 0 ? targetFloors : null,
    customTargetFloors,
    carpetArea,
  };

  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    return {
      details: {
        projectArea: area,
        primerRequirement: input.primerRequirement as PainterPrimerRequirement,
        puttyRequirement: input.puttyRequirement,
        materialsIncludeClient: null,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
        paintingScope: input.paintingScope,
        paintFinish: null,
        surfaceCondition: input.surfaceCondition,
        paintTopcoats: input.paintTopcoats,
        additionalRequirements: additional,
        ...floorFields,
      },
    };
  }

  return {
    details: {
      projectArea: area,
      primerRequirement: input.primerRequirement as PainterPrimerRequirement,
      puttyRequirement: input.puttyRequirement,
      materialsIncludeClient: null,
      projectStartTimeType: input.projectStartTimeType,
      projectStartTimeSpecificDate: null,
      paintingScope: input.paintingScope,
      paintFinish: null,
      surfaceCondition: input.surfaceCondition,
      paintTopcoats: input.paintTopcoats,
      additionalRequirements: additional,
      ...floorFields,
    },
  };
}

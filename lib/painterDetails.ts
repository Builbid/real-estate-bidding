// ============================================================
// Painter-only work requirements — stored as projects.painter_details
// ============================================================

import {
  isProjectStartDateNotInPast,
  PROJECT_START_DATE_PAST_INVALID_MESSAGE,
} from './projectStartTime';

export type PainterStartTimeType = '1week' | '2week' | '1month' | 'specific';

/** Legacy start-time values that may exist on older painter_details rows. */
type LegacyPainterStartTimeType = 'immediately';

export type PainterPrimerRequirement = 'None' | '1 Coat' | '2 Coats' | '3 Coats';

export type PainterPaintingScope = 'interior' | 'exterior' | 'both';

export type PainterPaintFinish = 'standard' | 'premium' | 'textured';

export type PainterSurfaceCondition = 'new' | 'repaint_good' | 'repaint_repair';

export type PainterPaintTopcoats = '1 Coat' | '2 Coats' | '3 Coats';

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
  additionalRequirements?: string | null;
}

export const PAINTER_PRIMER_OPTIONS: {
  value: PainterPrimerRequirement;
  label: string;
}[] = [
  { value: 'None', label: 'No Primer' },
  { value: '1 Coat', label: '1 Coat' },
  { value: '2 Coats', label: '2 Coats' },
  { value: '3 Coats', label: '3 Coats' },
];

export const PAINTER_SCOPE_OPTIONS: {
  value: PainterPaintingScope;
  label: string;
}[] = [
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'both', label: 'Both (Interior & Exterior)' },
];

export const PAINTER_FINISH_OPTIONS: {
  value: PainterPaintFinish;
  label: string;
}[] = [
  { value: 'standard', label: 'Standard (Distemper / Basic Emulsion)' },
  { value: 'premium', label: 'Premium (Royal Emulsion / Weatherproof)' },
  { value: 'textured', label: 'Textured / Decorative' },
];

export const PAINTER_SURFACE_OPTIONS: {
  value: PainterSurfaceCondition;
  label: string;
}[] = [
  { value: 'new', label: 'New Surface (Fresh Plaster)' },
  { value: 'repaint_good', label: 'Repaint (Good Condition)' },
  { value: 'repaint_repair', label: 'Repaint (Needs Repair / Crack Filling)' },
];

export const PAINTER_TOPCOAT_OPTIONS: PainterPaintTopcoats[] = [
  '1 Coat',
  '2 Coats',
  '3 Coats',
];

export const PAINTER_START_TIME_OPTIONS: {
  value: PainterStartTimeType;
  label: string;
}[] = [
  { value: '1week', label: 'Within one week' },
  { value: '2week', label: 'Within two week' },
  { value: '1month', label: 'Within 1 month' },
  { value: 'specific', label: 'Specific Date' },
];

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
const SCOPE_SET = new Set<string>(PAINTER_SCOPE_OPTIONS.map((o) => o.value));
const FINISH_SET = new Set<string>(PAINTER_FINISH_OPTIONS.map((o) => o.value));
const SURFACE_SET = new Set<string>(PAINTER_SURFACE_OPTIONS.map((o) => o.value));
const TOPCOAT_SET = new Set<string>(PAINTER_TOPCOAT_OPTIONS);

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

  return (
    typeof v.projectArea === 'number' &&
    Number.isFinite(v.projectArea) &&
    v.projectArea > 0 &&
    typeof v.primerRequirement === 'string' &&
    PRIMER_SET.has(v.primerRequirement) &&
    materialsOk &&
    normalizeStartTimeType(v.projectStartTimeType) != null &&
    optionalEnumOk(v.paintingScope, SCOPE_SET) &&
    optionalEnumOk(v.paintFinish, FINISH_SET) &&
    optionalEnumOk(v.surfaceCondition, SURFACE_SET) &&
    optionalEnumOk(v.paintTopcoats, TOPCOAT_SET) &&
    additionalOk
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
    typeof value.paintFinish === 'string' && FINISH_SET.has(value.paintFinish)
      ? (value.paintFinish as PainterPaintFinish)
      : null;
  const surfaceCondition =
    typeof value.surfaceCondition === 'string' && SURFACE_SET.has(value.surfaceCondition)
      ? (value.surfaceCondition as PainterSurfaceCondition)
      : null;
  const paintTopcoats =
    typeof value.paintTopcoats === 'string' && TOPCOAT_SET.has(value.paintTopcoats)
      ? (value.paintTopcoats as PainterPaintTopcoats)
      : null;
  const additionalRequirements =
    typeof value.additionalRequirements === 'string' && value.additionalRequirements.trim()
      ? value.additionalRequirements.trim()
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
    additionalRequirements,
  };
}

export function formatPainterProjectArea(area: number): string {
  return `Approx. ${area.toLocaleString('en-IN')} Sq. Ft.`;
}

export function formatPainterPrimer(primer: PainterPrimerRequirement): string {
  return optionLabel(PAINTER_PRIMER_OPTIONS, primer);
}

export function formatPainterMaterials(materialsIncludeClient: boolean): string {
  return materialsIncludeClient ? 'Without Material' : 'With Material';
}

export function formatPainterStartTime(details: PainterDetails): string {
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

export function getPainterWorkRequirementBlocks(details: PainterDetails): {
  label: string;
  value: string;
}[] {
  const blocks: { label: string; value: string }[] = [
    { label: 'Approximate Paint Area', value: formatPainterProjectArea(details.projectArea) },
  ];

  if (details.paintingScope) {
    blocks.push({
      label: 'Scope',
      value: optionLabel(PAINTER_SCOPE_OPTIONS, details.paintingScope),
    });
  }
  if (details.paintFinish) {
    blocks.push({
      label: 'Finish',
      value: optionLabel(PAINTER_FINISH_OPTIONS, details.paintFinish),
    });
  }
  if (details.surfaceCondition) {
    blocks.push({
      label: 'Condition',
      value: optionLabel(PAINTER_SURFACE_OPTIONS, details.surfaceCondition),
    });
  }

  blocks.push({
    label: 'Primer',
    value: formatPainterPrimer(details.primerRequirement),
  });

  if (details.paintTopcoats) {
    blocks.push({
      label: 'Topcoats',
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
    label: 'Work Start Time',
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
  primerRequirement: string;
  projectStartTimeType: PainterStartTimeType | null;
  projectStartTimeSpecificDate: string;
  paintingScope: PainterPaintingScope | null;
  paintFinish: PainterPaintFinish | null;
  surfaceCondition: PainterSurfaceCondition | null;
  paintTopcoats: PainterPaintTopcoats | null;
  additionalRequirements: string;
}): { error: string } | { details: PainterDetails } {
  const area =
    typeof input.projectArea === 'number'
      ? input.projectArea
      : parseFloat(String(input.projectArea).replace(/,/g, '').trim());

  if (!Number.isFinite(area) || area <= 0) {
    return { error: 'Enter a valid project area in sq.ft.' };
  }
  if (!input.paintingScope || !SCOPE_SET.has(input.paintingScope)) {
    return { error: 'Select a painting scope.' };
  }
  if (!input.paintFinish || !FINISH_SET.has(input.paintFinish)) {
    return { error: 'Select a paint finish / quality.' };
  }
  if (!input.surfaceCondition || !SURFACE_SET.has(input.surfaceCondition)) {
    return { error: 'Select a surface condition.' };
  }
  if (!PRIMER_SET.has(input.primerRequirement)) {
    return { error: 'Select a primer requirement.' };
  }
  if (!input.paintTopcoats || !TOPCOAT_SET.has(input.paintTopcoats)) {
    return { error: 'Select paint topcoats.' };
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
    if (!isProjectStartDateNotInPast(date)) {
      return { error: PROJECT_START_DATE_PAST_INVALID_MESSAGE };
    }
    return {
      details: {
        projectArea: area,
        primerRequirement: input.primerRequirement as PainterPrimerRequirement,
        materialsIncludeClient: null,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
        paintingScope: input.paintingScope,
        paintFinish: input.paintFinish,
        surfaceCondition: input.surfaceCondition,
        paintTopcoats: input.paintTopcoats,
        additionalRequirements: additional,
      },
    };
  }

  return {
    details: {
      projectArea: area,
      primerRequirement: input.primerRequirement as PainterPrimerRequirement,
      materialsIncludeClient: null,
      projectStartTimeType: input.projectStartTimeType,
      projectStartTimeSpecificDate: null,
      paintingScope: input.paintingScope,
      paintFinish: input.paintFinish,
      surfaceCondition: input.surfaceCondition,
      paintTopcoats: input.paintTopcoats,
      additionalRequirements: additional,
    },
  };
}

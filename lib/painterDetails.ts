// ============================================================
// Painter-only work requirements — stored as projects.painter_details
// ============================================================

export type PainterStartTimeType = '1week' | '2week' | '1month' | 'specific';

/** Legacy start-time values that may exist on older painter_details rows. */
type LegacyPainterStartTimeType = 'immediately';

export type PainterPrimerRequirement = 'None' | '1 Coat' | '2 Coats' | '3 Coats';

export interface PainterDetails {
  projectArea: number;
  primerRequirement: PainterPrimerRequirement;
  /** true = without material (client provides); false = with material (contractor provides) */
  materialsIncludeClient: boolean;
  projectStartTimeType: PainterStartTimeType;
  /** ISO date YYYY-MM-DD when projectStartTimeType === 'specific' */
  projectStartTimeSpecificDate?: string | null;
}

export const PAINTER_PRIMER_OPTIONS: PainterPrimerRequirement[] = [
  'None',
  '1 Coat',
  '2 Coats',
  '3 Coats',
];

export const PAINTER_MATERIALS_OPTIONS: {
  value: boolean;
  label: string;
}[] = [
  { value: true, label: 'Without Material' },
  { value: false, label: 'With Material' },
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

const PRIMER_SET = new Set<string>(PAINTER_PRIMER_OPTIONS);

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

export function isPainterDetails(value: unknown): value is PainterDetails {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.projectArea === 'number' &&
    Number.isFinite(v.projectArea) &&
    v.projectArea > 0 &&
    typeof v.primerRequirement === 'string' &&
    PRIMER_SET.has(v.primerRequirement) &&
    typeof v.materialsIncludeClient === 'boolean' &&
    normalizeStartTimeType(v.projectStartTimeType) != null
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
  return {
    projectArea: value.projectArea,
    primerRequirement: value.primerRequirement,
    materialsIncludeClient: value.materialsIncludeClient,
    projectStartTimeType,
    projectStartTimeSpecificDate: specific,
  };
}

export function formatPainterProjectArea(area: number): string {
  return `${area.toLocaleString('en-IN')} SQ.FT.`;
}

export function formatPainterPrimer(primer: PainterPrimerRequirement): string {
  return primer.toUpperCase();
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
  return [
    { label: 'Project Area', value: formatPainterProjectArea(details.projectArea) },
    { label: 'Primer Requirement', value: formatPainterPrimer(details.primerRequirement) },
    { label: 'Materials', value: formatPainterMaterials(details.materialsIncludeClient) },
    { label: 'Project Starting Time', value: formatPainterStartTime(details) },
  ];
}

export function validatePainterDetailsInput(input: {
  projectArea: string | number;
  primerRequirement: string;
  materialsIncludeClient: boolean | null;
  projectStartTimeType: PainterStartTimeType | null;
  projectStartTimeSpecificDate: string;
}): { error: string } | { details: PainterDetails } {
  const area =
    typeof input.projectArea === 'number'
      ? input.projectArea
      : parseFloat(String(input.projectArea).replace(/,/g, '').trim());

  if (!Number.isFinite(area) || area <= 0) {
    return { error: 'Enter a valid project area in sq.ft.' };
  }
  if (!PRIMER_SET.has(input.primerRequirement)) {
    return { error: 'Select a primer requirement.' };
  }
  if (input.materialsIncludeClient == null) {
    return { error: 'Select materials option (With Material or Without Material).' };
  }
  if (!input.projectStartTimeType || !START_TIME_TYPES.has(input.projectStartTimeType)) {
    return { error: 'Select when the project should start.' };
  }
  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: 'Select a specific project start date.' };
    }
    return {
      details: {
        projectArea: area,
        primerRequirement: input.primerRequirement as PainterPrimerRequirement,
        materialsIncludeClient: input.materialsIncludeClient,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
      },
    };
  }

  return {
    details: {
      projectArea: area,
      primerRequirement: input.primerRequirement as PainterPrimerRequirement,
      materialsIncludeClient: input.materialsIncludeClient,
      projectStartTimeType: input.projectStartTimeType,
      projectStartTimeSpecificDate: null,
    },
  };
}

// ============================================================
// Painter-only work requirements — stored as projects.painter_details
// ============================================================

export type PainterStartTimeType = 'immediately' | '1week' | '1month' | 'specific';

export type PainterPrimerRequirement = 'None' | '1 Coat' | '2 Coats' | '3 Coats';

export interface PainterDetails {
  projectArea: number;
  primerRequirement: PainterPrimerRequirement;
  /** true = materials provided by client; false = contractor brings materials */
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

export const PAINTER_START_TIME_OPTIONS: {
  value: PainterStartTimeType;
  label: string;
}[] = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1week', label: 'Within one week' },
  { value: '1month', label: 'Within 1 month' },
  { value: 'specific', label: 'Specific Date' },
];

const START_TIME_TYPES = new Set<PainterStartTimeType>([
  'immediately',
  '1week',
  '1month',
  'specific',
]);

const PRIMER_SET = new Set<string>(PAINTER_PRIMER_OPTIONS);

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
    typeof v.projectStartTimeType === 'string' &&
    START_TIME_TYPES.has(v.projectStartTimeType as PainterStartTimeType)
  );
}

export function parsePainterDetails(value: unknown): PainterDetails | null {
  if (!isPainterDetails(value)) return null;
  const specific =
    value.projectStartTimeType === 'specific' &&
    typeof value.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.projectStartTimeSpecificDate)
      ? value.projectStartTimeSpecificDate
      : null;
  return {
    projectArea: value.projectArea,
    primerRequirement: value.primerRequirement,
    materialsIncludeClient: value.materialsIncludeClient,
    projectStartTimeType: value.projectStartTimeType,
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
  return materialsIncludeClient
    ? 'YES (Client provided)'
    : 'NO (Contractor provided)';
}

export function formatPainterStartTime(details: PainterDetails): string {
  switch (details.projectStartTimeType) {
    case 'immediately':
      return 'Immediately';
    case '1week':
      return 'Within one week';
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
    return { error: 'Select whether materials are provided by the client.' };
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

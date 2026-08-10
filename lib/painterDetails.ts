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
  /**
   * Optional / legacy. true = without material (client provides);
   * false = with material (contractor provides); null = not collected.
   */
  materialsIncludeClient?: boolean | null;
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
  const materialsOk =
    v.materialsIncludeClient === undefined ||
    v.materialsIncludeClient === null ||
    typeof v.materialsIncludeClient === 'boolean';
  return (
    typeof v.projectArea === 'number' &&
    Number.isFinite(v.projectArea) &&
    v.projectArea > 0 &&
    typeof v.primerRequirement === 'string' &&
    PRIMER_SET.has(v.primerRequirement) &&
    materialsOk &&
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
    materialsIncludeClient:
      typeof value.materialsIncludeClient === 'boolean'
        ? value.materialsIncludeClient
        : null,
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
  const blocks = [
    { label: 'Project Area', value: formatPainterProjectArea(details.projectArea) },
    { label: 'Primer Requirement', value: formatPainterPrimer(details.primerRequirement) },
  ];
  // Legacy rows only — materials is no longer collected on the form.
  if (typeof details.materialsIncludeClient === 'boolean') {
    blocks.push({
      label: 'Materials',
      value: formatPainterMaterials(details.materialsIncludeClient),
    });
  }
  blocks.push({
    label: 'Project Starting Time',
    value: formatPainterStartTime(details),
  });
  return blocks;
}

export function validatePainterDetailsInput(input: {
  projectArea: string | number;
  primerRequirement: string;
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
        materialsIncludeClient: null,
        projectStartTimeType: 'specific',
        projectStartTimeSpecificDate: date,
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
    },
  };
}

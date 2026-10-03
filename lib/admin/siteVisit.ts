/** Shared (client + server) Site Visit Checklist types and validation. */

export const SOIL_TYPES = [
  { value: 'hard', label: 'Hard / rocky' },
  { value: 'medium', label: 'Medium (normal alluvial)' },
  { value: 'soft', label: 'Soft / clayey' },
  { value: 'filled', label: 'Filled / made-up ground' },
] as const;

export type SoilType = (typeof SOIL_TYPES)[number]['value'];

export interface SiteVisitInput {
  visitDate: string; // YYYY-MM-DD
  plotLengthFt: string;
  plotWidthFt: string;
  plinthAreaSqft: string;
  floors: string;
  soilType: string;
  roadWidthFt: string;
  waterAvailable: boolean;
  electricityAvailable: boolean;
  storageAvailable: boolean;
  siteNotes: string;
}

export interface SiteVisitRecord {
  projectId: string;
  visitDate: string;
  plotLengthFt: number;
  plotWidthFt: number;
  plinthAreaSqft: number;
  floors: number;
  soilType: SoilType;
  roadWidthFt: number;
  waterAvailable: boolean;
  electricityAvailable: boolean;
  storageAvailable: boolean;
  siteNotes: string;
  updatedAt: string;
}

export function soilLabel(value: string | null | undefined): string {
  return SOIL_TYPES.find((s) => s.value === value)?.label ?? '—';
}

export const EMPTY_SITE_VISIT_INPUT: SiteVisitInput = {
  visitDate: '',
  plotLengthFt: '',
  plotWidthFt: '',
  plinthAreaSqft: '',
  floors: '1',
  soilType: '',
  roadWidthFt: '',
  waterAvailable: false,
  electricityAvailable: false,
  storageAvailable: false,
  siteNotes: '',
};

export function siteVisitToInput(record: SiteVisitRecord): SiteVisitInput {
  return {
    visitDate: record.visitDate,
    plotLengthFt: String(record.plotLengthFt),
    plotWidthFt: String(record.plotWidthFt),
    plinthAreaSqft: String(record.plinthAreaSqft),
    floors: String(record.floors),
    soilType: record.soilType,
    roadWidthFt: String(record.roadWidthFt),
    waterAvailable: record.waterAvailable,
    electricityAvailable: record.electricityAvailable,
    storageAvailable: record.storageAvailable,
    siteNotes: record.siteNotes,
  };
}

function num(raw: string): number {
  return Number(String(raw).replace(/,/g, '').trim());
}

export interface ParsedSiteVisit {
  visitDate: string;
  plotLengthFt: number;
  plotWidthFt: number;
  plinthAreaSqft: number;
  floors: number;
  soilType: SoilType;
  roadWidthFt: number;
  waterAvailable: boolean;
  electricityAvailable: boolean;
  storageAvailable: boolean;
  siteNotes: string;
}

/** Validates real field measurements. Returns an error string or the parsed values. */
export function parseSiteVisitInput(
  input: SiteVisitInput,
  today: string,
): { error: string } | { value: ParsedSiteVisit } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitDate)) {
    return { error: 'Choose the date of the site visit.' };
  }
  if (input.visitDate > today) {
    return { error: 'The site visit date cannot be in the future.' };
  }

  const plotLengthFt = num(input.plotLengthFt);
  const plotWidthFt = num(input.plotWidthFt);
  if (!Number.isFinite(plotLengthFt) || plotLengthFt <= 0 || plotLengthFt > 5000) {
    return { error: 'Enter the measured plot length in feet.' };
  }
  if (!Number.isFinite(plotWidthFt) || plotWidthFt <= 0 || plotWidthFt > 5000) {
    return { error: 'Enter the measured plot width in feet.' };
  }

  const plinthAreaSqft = num(input.plinthAreaSqft);
  if (!Number.isFinite(plinthAreaSqft) || plinthAreaSqft <= 0) {
    return { error: 'Enter the measured plinth area in sq. ft.' };
  }
  if (plinthAreaSqft > plotLengthFt * plotWidthFt * 1.01) {
    return { error: 'Plinth area cannot be larger than the plot (length × width).' };
  }

  const floors = Math.trunc(num(input.floors));
  if (!Number.isFinite(floors) || floors < 1 || floors > 20) {
    return { error: 'Enter the number of floors (1 to 20).' };
  }

  if (!SOIL_TYPES.some((s) => s.value === input.soilType)) {
    return { error: 'Select the soil condition observed at the site.' };
  }

  const roadWidthFt = num(input.roadWidthFt);
  if (!Number.isFinite(roadWidthFt) || roadWidthFt < 0 || roadWidthFt > 500) {
    return { error: 'Enter the access road width in feet (0 if none).' };
  }

  const siteNotes = input.siteNotes.trim().slice(0, 1000);

  return {
    value: {
      visitDate: input.visitDate,
      plotLengthFt,
      plotWidthFt,
      plinthAreaSqft,
      floors,
      soilType: input.soilType as SoilType,
      roadWidthFt,
      waterAvailable: input.waterAvailable,
      electricityAvailable: input.electricityAvailable,
      storageAvailable: input.storageAvailable,
      siteNotes,
    },
  };
}

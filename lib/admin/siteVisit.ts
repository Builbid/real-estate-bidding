/** Shared (client + server) Site Visit Checklist types and validation. */
import type { MeasuredLineItem, MeasurementTradeKey } from '@/lib/admin/siteMeasurements';

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
  /** Supervisor-measured quantity per trade measurement line (line id -> quantity). */
  measurements: Record<string, string>;
}

export interface SiteVisitRecord {
  projectId: string;
  visitDate: string;
  /** 0 when the trade does not record plot dimensions (plumbing, electrical, painting, ...). */
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
  tradeKey: MeasurementTradeKey | null;
  measurements: Record<string, string>;
  /** Itemised measured quantity x agreed rate lines saved with the checklist. */
  lineItems: MeasuredLineItem[];
  /** "Total Accurate Cost" computed from the measured quantities (null for legacy checklists). */
  totalAccurateCost: number | null;
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
  measurements: {},
};

function blankIfZero(value: number): string {
  return value > 0 ? String(value) : '';
}

export function siteVisitToInput(record: SiteVisitRecord): SiteVisitInput {
  return {
    visitDate: record.visitDate,
    plotLengthFt: blankIfZero(record.plotLengthFt),
    plotWidthFt: blankIfZero(record.plotWidthFt),
    plinthAreaSqft: blankIfZero(record.plinthAreaSqft),
    floors: String(record.floors),
    soilType: record.soilType,
    roadWidthFt: String(record.roadWidthFt),
    waterAvailable: record.waterAvailable,
    electricityAvailable: record.electricityAvailable,
    storageAvailable: record.storageAvailable,
    siteNotes: record.siteNotes,
    measurements: { ...record.measurements },
  };
}

function num(raw: string): number {
  return Number(String(raw).replace(/,/g, '').trim());
}

function isBlank(raw: string): boolean {
  return String(raw ?? '').trim() === '';
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

/**
 * Validates real field measurements. Returns an error string or the parsed values.
 * `requirePlot` is true for Civil / Mistri work (plot + plinth dimensions); other trades
 * measure their itemised quantities instead and the plot fields are optional.
 */
export function parseSiteVisitInput(
  input: SiteVisitInput,
  today: string,
  options: { requirePlot?: boolean } = {},
): { error: string } | { value: ParsedSiteVisit } {
  const requirePlot = options.requirePlot ?? true;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitDate)) {
    return { error: 'Choose the date of the site visit.' };
  }
  if (input.visitDate > today) {
    return { error: 'The site visit date cannot be in the future.' };
  }

  let plotLengthFt = 0;
  let plotWidthFt = 0;
  let plinthAreaSqft = 0;

  const plotProvided = !isBlank(input.plotLengthFt) || !isBlank(input.plotWidthFt);
  if (requirePlot || plotProvided) {
    plotLengthFt = num(input.plotLengthFt);
    plotWidthFt = num(input.plotWidthFt);
    if (!Number.isFinite(plotLengthFt) || plotLengthFt <= 0 || plotLengthFt > 5000) {
      return { error: 'Enter the measured plot length in feet.' };
    }
    if (!Number.isFinite(plotWidthFt) || plotWidthFt <= 0 || plotWidthFt > 5000) {
      return { error: 'Enter the measured plot width in feet.' };
    }
  }

  if (requirePlot || !isBlank(input.plinthAreaSqft)) {
    plinthAreaSqft = num(input.plinthAreaSqft);
    if (!Number.isFinite(plinthAreaSqft) || plinthAreaSqft <= 0) {
      return { error: 'Enter the measured plinth area in sq. ft.' };
    }
    if (plotLengthFt > 0 && plotWidthFt > 0 && plinthAreaSqft > plotLengthFt * plotWidthFt * 1.01) {
      return { error: 'Plinth area cannot be larger than the plot (length × width).' };
    }
  }

  const floors = isBlank(input.floors) ? 1 : Math.trunc(num(input.floors));
  if (!Number.isFinite(floors) || floors < 1 || floors > 20) {
    return { error: 'Enter the number of floors (1 to 20).' };
  }

  if (!SOIL_TYPES.some((s) => s.value === input.soilType)) {
    return { error: 'Select the soil condition observed at the site.' };
  }

  const roadWidthFt = isBlank(input.roadWidthFt) ? 0 : num(input.roadWidthFt);
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

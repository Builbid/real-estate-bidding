import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import {
  formatMistriFloorWorkLabel,
  getMistriRccScopeTitle,
  isAssamMistriFloor,
  MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS,
  MISTRI_FLOORING_MATERIAL_OPTIONS,
  parseMistriDetails,
  sortMistriFloorWork,
  type MistriFloorId,
  type MistriFloorWork,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { Bid, BidFloorRateKey, BidRates, Project, SubConfiguration, TrackType } from '@/lib/types';
import { normalizeServiceType, getBidRateFieldError, type BidRateRules } from '@/lib/validation/bidRates';

const FLOOR_RATE_KEYS: BidFloorRateKey[] = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'];

export const TILE_FITTING_RATE_LABEL = 'Tile Fitting Rate';
export const TILE_FITTING_RATE_UNIT = '/sqft floor area';
export const TILE_FITTING_RATE_HINT =
  'Informational add-on only. This rate is not added to the total estimated civil cost and is not used for ranking.';

export interface MistriCivilFloor {
  floorId: string;
  label: string;
  slabAreaSqft: number;
  rateKey?: BidFloorRateKey;
  includeFlooring: boolean;
  flooringMaterial?: string | null;
  flooringMaterialLabel?: string | null;
  scopeTitle?: string | null;
}

export interface MistriFloorCivilBreakdown {
  floorId: string;
  label: string;
  slabAreaSqft: number;
  civilRate: number;
  civilCost: number;
  flooringRate?: number;
  flooringMaterial?: string;
}

export interface MistriFlooringRateDisplayEntry {
  floorId: string;
  floorLabel: string;
  materialLabel: string;
  label: string;
  rate: number;
}

export interface MistriCivilCostProject {
  service_type?: Project['service_type'] | string | null;
  track_type?: TrackType | null;
  total_floors?: number | null;
  sub_configuration?: SubConfiguration | null;
  building_types?: string[] | null;
  mistri_details?: unknown;
  floor_area_sqft?: number | null;
}

function toRateInputLabel(raw: string): string {
  return raw.replace(/^RCC\s+/i, '').trim() || raw;
}

export function flooringFittingTitle(materialLabel: string): string {
  return `${materialLabel} Fitting Rate`;
}

export function flooringFittingFieldLabel(materialLabel: string): string {
  return `₹ ${materialLabel} Rate per sq. ft. of floor area`;
}

function resolveFlooringMaterialLabel(
  material: string | null | undefined,
  floorId: MistriFloorId,
): string {
  if (!material) return 'Flooring';
  const options = isAssamMistriFloor(floorId)
    ? MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS
    : MISTRI_FLOORING_MATERIAL_OPTIONS;
  return (
    options.find((option) => option.value === material)?.label
    ?? MISTRI_FLOORING_MATERIAL_OPTIONS.find((option) => option.value === material)?.label
    ?? MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS.find((option) => option.value === material)?.label
    ?? 'Flooring'
  );
}

function floorHasFlooringWork(fw: MistriFloorWork): boolean {
  return fw.includeFineFlooring === true || fw.workTypes.includes('flooring');
}

export function isMistriCivilCostProject(
  project: { service_type?: string | null } | null | undefined,
): boolean {
  return normalizeServiceType(project?.service_type) === 'labour_contractor';
}

export function parseTileFittingRate(
  rates: Partial<BidRates> | null | undefined,
): number | null {
  const value = rates?.tile_fitting_rate;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function computeMistriFloorCivilCost(slabAreaSqft: number, civilRate: number): number {
  if (!(slabAreaSqft > 0) || !(civilRate > 0)) return 0;
  return Math.round(slabAreaSqft * civilRate);
}

function resolveBuiltUpAreaSqft(
  detailsArea: number | undefined,
  projectArea: number | undefined,
): number {
  if (detailsArea && detailsArea > 0) return detailsArea;
  if (projectArea && projectArea > 0) return projectArea;
  return 0;
}

export function resolveMistriCivilFloors(project: MistriCivilCostProject): MistriCivilFloor[] {
  const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const work = details?.floorWork?.length ? sortMistriFloorWork(details.floorWork) : [];
  const builtUpAreaSqft = resolveBuiltUpAreaSqft(
    details?.approximateAreaSqft,
    project.floor_area_sqft ?? undefined,
  );

  if (work.length > 0) {
    return work.map((fw, index) => {
      const includeFlooring = floorHasFlooringWork(fw);
      const sourceFloorId = fw.floorId;
      return {
        floorId:
          fw.floorId === 'custom'
            ? `custom:${fw.customFloorNumber ?? index}`
            : fw.floorId,
        label: toRateInputLabel(formatMistriFloorWorkLabel(fw)),
        slabAreaSqft: builtUpAreaSqft,
        rateKey: FLOOR_RATE_KEYS[index],
        includeFlooring,
        flooringMaterial: includeFlooring ? (fw.flooringMaterial ?? null) : null,
        flooringMaterialLabel: includeFlooring
          ? resolveFlooringMaterialLabel(fw.flooringMaterial, sourceFloorId)
          : null,
        scopeTitle: getMistriRccScopeTitle(fw.workTypes, fw.scopeOption),
      };
    });
  }

  const floors = resolveProjectBidFloors({
    track_type: (project.track_type as TrackType) ?? 'RCC',
    total_floors: project.total_floors,
    sub_configuration: project.sub_configuration,
    building_types: project.building_types,
    mistri_details: project.mistri_details,
  });
  const labels = floors.labels.length > 0 ? floors.labels : ['Selected floor'];
  const includeFlooring = details?.civilWorkTypes?.includes('tile_marble_flooring') === true;

  return labels.map((label, index) => ({
    floorId: label,
    label,
    slabAreaSqft: builtUpAreaSqft,
    rateKey: FLOOR_RATE_KEYS[index],
    includeFlooring,
    flooringMaterial: includeFlooring ? 'tile' : null,
    flooringMaterialLabel: includeFlooring ? 'Flooring' : null,
    scopeTitle: null,
  }));
}

export function civilRatesFromBid(
  rates: Partial<BidRates> | null | undefined,
  floors: MistriCivilFloor[],
): number[] {
  const breakdown = Array.isArray(rates?.floor_civil_breakdown)
    ? rates.floor_civil_breakdown
    : [];
  return floors.map((floor, index) => {
    const fromBreakdown = breakdown[index]?.civilRate;
    if (typeof fromBreakdown === 'number' && fromBreakdown > 0) return fromBreakdown;
    const key = floor.rateKey ?? FLOOR_RATE_KEYS[index];
    const fromKey = key ? rates?.[key] : undefined;
    return typeof fromKey === 'number' && fromKey > 0 ? fromKey : 0;
  });
}

export function parseFlooringRatesFromBid(
  rates: Partial<BidRates> | null | undefined,
  floors: MistriCivilFloor[],
): Record<string, number> {
  const stored = rates?.flooring_rates;
  const breakdown = Array.isArray(rates?.floor_civil_breakdown)
    ? rates.floor_civil_breakdown
    : [];
  const legacy = parseTileFittingRate(rates);
  const result: Record<string, number> = {};

  for (const floor of floors) {
    if (!floor.includeFlooring) continue;
    const fromMap = stored?.[floor.floorId];
    if (typeof fromMap === 'number' && Number.isFinite(fromMap) && fromMap > 0) {
      result[floor.floorId] = fromMap;
      continue;
    }
    const fromBreakdown = breakdown.find((row) => row.floorId === floor.floorId)?.flooringRate;
    if (typeof fromBreakdown === 'number' && Number.isFinite(fromBreakdown) && fromBreakdown > 0) {
      result[floor.floorId] = fromBreakdown;
      continue;
    }
    if (legacy != null) {
      result[floor.floorId] = legacy;
    }
  }

  return result;
}

export function buildMistriCivilCostPayload(
  floors: MistriCivilFloor[],
  civilRates: number[],
  flooringRates?: Record<string, number> | null,
): BidRates {
  const floor_civil_breakdown: MistriFloorCivilBreakdown[] = floors.map((floor, index) => {
    const civilRate = civilRates[index] ?? 0;
    const flooringRate = floor.includeFlooring
      ? (flooringRates?.[floor.floorId] ?? 0)
      : 0;
    return {
      floorId: floor.floorId,
      label: floor.label,
      slabAreaSqft: floor.slabAreaSqft,
      civilRate,
      civilCost: computeMistriFloorCivilCost(floor.slabAreaSqft, civilRate),
      ...(floor.includeFlooring && flooringRate > 0
        ? {
            flooringRate,
            flooringMaterial: floor.flooringMaterialLabel ?? 'Flooring',
          }
        : {}),
    };
  });
  const total_civil_cost = floor_civil_breakdown.reduce((sum, row) => sum + row.civilCost, 0);
  const flooring_rates: Record<string, number> = {};
  for (const floor of floors) {
    if (!floor.includeFlooring) continue;
    const rate = flooringRates?.[floor.floorId] ?? 0;
    if (rate > 0) flooring_rates[floor.floorId] = rate;
  }
  const firstFlooringRate = Object.values(flooring_rates)[0];

  return {
    ground_rate: floor_civil_breakdown[0]?.civilRate ?? 0,
    first_rate: floor_civil_breakdown[1] ? floor_civil_breakdown[1].civilRate : undefined,
    second_rate: floor_civil_breakdown[2] ? floor_civil_breakdown[2].civilRate : undefined,
    third_rate: floor_civil_breakdown[3] ? floor_civil_breakdown[3].civilRate : undefined,
    bid_unit: 'per_sqft',
    total_civil_cost,
    floor_civil_breakdown,
    ...(Object.keys(flooring_rates).length > 0 ? { flooring_rates } : {}),
    ...(firstFlooringRate != null && firstFlooringRate > 0
      ? { tile_fitting_rate: firstFlooringRate }
      : {}),
  };
}

export function mistriRankMetric(bid: {
  total_sum_metric?: number | null;
  rates?: Partial<BidRates> | null;
}): number {
  const stored = bid.rates?.total_civil_cost;
  if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) return stored;
  return Number(bid.total_sum_metric ?? 0);
}

export function sortBidsByMistriCivilCost<T extends {
  total_sum_metric?: number | null;
  rates?: Partial<BidRates> | null;
}>(bids: T[]): T[] {
  return [...bids].sort((a, b) => mistriRankMetric(a) - mistriRankMetric(b));
}

export function getMistriCivilCostDisplayEntries(
  rates: Partial<BidRates> | null | undefined,
  floors?: MistriCivilFloor[],
): Array<{ label: string; value: number; suffix?: string }> {
  const breakdown = Array.isArray(rates?.floor_civil_breakdown)
    ? rates.floor_civil_breakdown
    : [];
  if (breakdown.length > 0) {
    return breakdown
      .filter((row) => row.civilRate > 0 || row.civilCost > 0)
      .map((row) => ({
        label: `${row.label} · ${Number(row.slabAreaSqft || 0).toLocaleString('en-IN')} sqft × ₹${Number(row.civilRate || 0).toLocaleString('en-IN')}`,
        value: Number(row.civilCost || 0),
        suffix: '',
      }));
  }

  const sourceFloors = floors ?? [];
  const civilRates = civilRatesFromBid(rates, sourceFloors);
  return sourceFloors.flatMap((floor, index) => {
    const civilRate = civilRates[index] ?? 0;
    if (!(civilRate > 0)) return [];
    return [{
      label: `${floor.label} · ${floor.slabAreaSqft.toLocaleString('en-IN')} sqft × ₹${civilRate.toLocaleString('en-IN')}`,
      value: computeMistriFloorCivilCost(floor.slabAreaSqft, civilRate),
      suffix: '',
    }];
  });
}

export function getMistriCivilRateDisplayEntries(
  rates: Partial<BidRates> | null | undefined,
  floors?: MistriCivilFloor[],
): Array<{ label: string; rate: number }> {
  const breakdown = Array.isArray(rates?.floor_civil_breakdown)
    ? rates.floor_civil_breakdown
    : [];
  if (breakdown.length > 0) {
    return breakdown
      .filter((row) => row.civilRate > 0)
      .map((row) => ({
        label: row.label,
        rate: Number(row.civilRate || 0),
      }));
  }

  const sourceFloors = floors ?? [];
  const civilRates = civilRatesFromBid(rates, sourceFloors);
  return sourceFloors.flatMap((floor, index) => {
    const civilRate = civilRates[index] ?? 0;
    if (!(civilRate > 0)) return [];
    return [{ label: floor.label, rate: civilRate }];
  });
}

export function getMistriFlooringRateDisplayEntries(
  rates: Partial<BidRates> | null | undefined,
  floors: MistriCivilFloor[],
): MistriFlooringRateDisplayEntry[] {
  const parsed = parseFlooringRatesFromBid(rates, floors);
  const breakdown = Array.isArray(rates?.floor_civil_breakdown)
    ? rates.floor_civil_breakdown
    : [];

  return floors.flatMap((floor) => {
    if (!floor.includeFlooring) return [];
    const rate = parsed[floor.floorId];
    if (!(rate > 0)) return [];
    const materialLabel =
      breakdown.find((row) => row.floorId === floor.floorId)?.flooringMaterial
      || floor.flooringMaterialLabel
      || 'Flooring';
    return [{
      floorId: floor.floorId,
      floorLabel: floor.label,
      materialLabel,
      label: `${floor.label} · ${flooringFittingTitle(materialLabel)}`,
      rate,
    }];
  });
}

export function validateMistriCivilBid(
  floors: MistriCivilFloor[],
  civilRates: number[],
  flooringRates: Record<string, number> | undefined,
  rules?: BidRateRules,
): { valid: boolean; message: string | null } {
  if (floors.length === 0) {
    return { valid: false, message: 'No floors found for this project.' };
  }

  for (let index = 0; index < floors.length; index += 1) {
    const floor = floors[index];
    if (!(floor.slabAreaSqft > 0)) {
      return { valid: false, message: 'Built-up area is missing for this project.' };
    }
    const rate = civilRates[index];
    if (rate == null || rate <= 0) {
      return {
        valid: false,
        message: `Enter a civil construction rate for ${floor.label}.`,
      };
    }
    const fieldError = getBidRateFieldError(rate, rules);
    if (fieldError) return { valid: false, message: fieldError };
  }

  for (const floor of floors) {
    if (!floor.includeFlooring) continue;
    const materialLabel = floor.flooringMaterialLabel || 'Flooring';
    const flooringRate = flooringRates?.[floor.floorId];
    if (flooringRate == null || flooringRate <= 0) {
      return {
        valid: false,
        message: `Enter a ${materialLabel.toLowerCase()} fitting rate for ${floor.label}.`,
      };
    }
    const flooringError = getBidRateFieldError(flooringRate, rules);
    if (flooringError) return { valid: false, message: flooringError };
  }

  return { valid: true, message: null };
}

export type BidLikeForRank = Pick<Bid, 'total_sum_metric'> & {
  rates?: BidRates | null;
};

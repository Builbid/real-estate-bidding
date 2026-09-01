import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import {
  formatMistriFloorWorkLabel,
  parseMistriDetails,
  sortMistriFloorWork,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { Bid, BidFloorRateKey, BidRates, Project, SubConfiguration, TrackType } from '@/lib/types';
import { normalizeServiceType, getBidRateFieldError, type BidRateRules } from '@/lib/validation/bidRates';

const FLOOR_RATE_KEYS: BidFloorRateKey[] = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'];

export const TILE_FITTING_RATE_LABEL = 'Tile Fitting Rate';
export const TILE_FITTING_RATE_UNIT = '/sqft floor area';
export const TILE_FITTING_RATE_HINT =
  'Informational add-on only. This rate is not added to Total Civil Construction Cost and is not used for ranking.';

export interface MistriCivilFloor {
  floorId: string;
  label: string;
  slabAreaSqft: number;
  rateKey?: BidFloorRateKey;
}

export interface MistriFloorCivilBreakdown {
  floorId: string;
  label: string;
  slabAreaSqft: number;
  civilRate: number;
  civilCost: number;
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

function fallbackAreaPerFloor(
  detailsArea: number | undefined,
  projectArea: number | undefined,
  floorCount: number,
): number {
  const total = detailsArea && detailsArea > 0
    ? detailsArea
    : projectArea && projectArea > 0
      ? projectArea
      : 0;
  if (!(total > 0) || floorCount <= 0) return 0;
  return Math.round((total / floorCount) * 100) / 100;
}

export function resolveMistriCivilFloors(project: MistriCivilCostProject): MistriCivilFloor[] {
  const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const work = details?.floorWork?.length ? sortMistriFloorWork(details.floorWork) : [];
  const projectArea = details?.approximateAreaSqft || project.floor_area_sqft || 0;

  if (work.length > 0) {
    const sharedFallback = fallbackAreaPerFloor(details?.approximateAreaSqft, project.floor_area_sqft ?? undefined, work.length);
    return work.map((fw, index) => {
      const ownArea = fw.slabAreaSqft != null && fw.slabAreaSqft > 0 ? fw.slabAreaSqft : 0;
      const slabAreaSqft =
        ownArea > 0
          ? ownArea
          : work.length === 1 && projectArea > 0
            ? projectArea
            : sharedFallback;
      return {
        floorId:
          fw.floorId === 'custom'
            ? `custom:${fw.customFloorNumber ?? index}`
            : fw.floorId,
        label: toRateInputLabel(formatMistriFloorWorkLabel(fw)),
        slabAreaSqft,
        rateKey: FLOOR_RATE_KEYS[index],
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
  const perFloor = fallbackAreaPerFloor(details?.approximateAreaSqft, project.floor_area_sqft ?? undefined, labels.length);

  return labels.map((label, index) => ({
    floorId: label,
    label,
    slabAreaSqft: perFloor,
    rateKey: FLOOR_RATE_KEYS[index],
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

export function buildMistriCivilCostPayload(
  floors: MistriCivilFloor[],
  civilRates: number[],
  tileFittingRate?: number | null,
): BidRates {
  const floor_civil_breakdown: MistriFloorCivilBreakdown[] = floors.map((floor, index) => {
    const civilRate = civilRates[index] ?? 0;
    return {
      floorId: floor.floorId,
      label: floor.label,
      slabAreaSqft: floor.slabAreaSqft,
      civilRate,
      civilCost: computeMistriFloorCivilCost(floor.slabAreaSqft, civilRate),
    };
  });
  const total_civil_cost = floor_civil_breakdown.reduce((sum, row) => sum + row.civilCost, 0);

  return {
    ground_rate: floor_civil_breakdown[0]?.civilRate ?? 0,
    first_rate: floor_civil_breakdown[1] ? floor_civil_breakdown[1].civilRate : undefined,
    second_rate: floor_civil_breakdown[2] ? floor_civil_breakdown[2].civilRate : undefined,
    third_rate: floor_civil_breakdown[3] ? floor_civil_breakdown[3].civilRate : undefined,
    bid_unit: 'per_sqft',
    total_civil_cost,
    floor_civil_breakdown,
    ...(tileFittingRate != null && tileFittingRate > 0 ? { tile_fitting_rate: tileFittingRate } : {}),
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

export function validateMistriCivilBid(
  floors: MistriCivilFloor[],
  civilRates: number[],
  tileFittingRate: number | undefined,
  rules?: BidRateRules,
): { valid: boolean; message: string | null } {
  if (floors.length === 0) {
    return { valid: false, message: 'No floors found for this project.' };
  }

  for (let index = 0; index < floors.length; index += 1) {
    const floor = floors[index];
    if (!(floor.slabAreaSqft > 0)) {
      return { valid: false, message: `Slab area is missing for ${floor.label}.` };
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

  if (tileFittingRate == null || tileFittingRate <= 0) {
    return {
      valid: false,
      message: 'Enter a tile fitting rate (₹ per sq. ft. of floor area).',
    };
  }
  const tileError = getBidRateFieldError(tileFittingRate, rules);
  if (tileError) return { valid: false, message: tileError };

  return { valid: true, message: null };
}

export type BidLikeForRank = Pick<Bid, 'total_sum_metric'> & {
  rates?: BidRates | null;
};

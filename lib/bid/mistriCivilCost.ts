import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import {
  formatMistriFloorWorkLabel,
  getMistriRccScopeTitle,
  isAssamMistriFloor,
  isMistriWallPlasterOnlyFloor,
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
  'This flooring rate is multiplied by the client’s flooring work area and added to the total estimated project cost used for ranking.';

export const WALL_CONSTRUCTION_RATE_LABEL = 'Wall Construction & Plastering Rate';
export const WALL_CONSTRUCTION_RATE_UNIT = '/sqft wall area';
export const WALL_CONSTRUCTION_RATE_FIELD_LABEL =
  'Wall Construction & Plastering Rate (₹/sq. ft. of wall area)';

export type MistriFloorCostKind = 'civil' | 'wall';

export interface MistriCivilFloor {
  floorId: string;
  label: string;
  slabAreaSqft: number;
  rateKey?: BidFloorRateKey;
  costKind: MistriFloorCostKind;
  wallAreaSqft: number;
  includeFlooring: boolean;
  flooringAreaSqft: number;
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
  costKind?: MistriFloorCostKind;
  wallAreaSqft?: number;
  wallRate?: number;
  wallCost?: number;
  flooringAreaSqft?: number;
  flooringRate?: number;
  flooringCost?: number;
  flooringMaterial?: string;
  floorTotal?: number;
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

export function computeMistriFloorFlooringCost(flooringAreaSqft: number, flooringRate: number): number {
  if (!(flooringAreaSqft > 0) || !(flooringRate > 0)) return 0;
  return Math.round(flooringAreaSqft * flooringRate);
}

export function computeMistriFloorWallCost(wallAreaSqft: number, wallRate: number): number {
  if (!(wallAreaSqft > 0) || !(wallRate > 0)) return 0;
  return Math.round(wallAreaSqft * wallRate);
}

function floorPrimaryRate(row: {
  costKind?: MistriFloorCostKind;
  civilRate?: number;
  wallRate?: number;
}): number {
  if (row.costKind === 'wall') return Number(row.wallRate || 0);
  return Number(row.civilRate || 0);
}

function floorPrimaryCost(row: {
  costKind?: MistriFloorCostKind;
  civilCost?: number;
  wallCost?: number;
}): number {
  if (row.costKind === 'wall') return Number(row.wallCost || 0);
  return Number(row.civilCost || 0);
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
      const flooringAreaSqft = includeFlooring
        ? (fw.flooringAreaSqft && fw.flooringAreaSqft > 0 ? fw.flooringAreaSqft : builtUpAreaSqft)
        : 0;
      const isWall = isMistriWallPlasterOnlyFloor(fw);
      const wallAreaSqft = isWall
        ? (fw.wallAreaSqft && fw.wallAreaSqft > 0 ? fw.wallAreaSqft : 0)
        : 0;
      return {
        floorId:
          fw.floorId === 'custom'
            ? `custom:${fw.customFloorNumber ?? index}`
            : fw.floorId,
        label: toRateInputLabel(formatMistriFloorWorkLabel(fw)),
        slabAreaSqft: builtUpAreaSqft,
        rateKey: FLOOR_RATE_KEYS[index],
        costKind: isWall ? 'wall' : 'civil',
        wallAreaSqft,
        includeFlooring,
        flooringAreaSqft,
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
    costKind: 'civil' as const,
    wallAreaSqft: 0,
    includeFlooring,
    flooringAreaSqft: includeFlooring ? builtUpAreaSqft : 0,
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
    const fromBreakdown = breakdown[index];
    if (floor.costKind === 'wall') {
      const wallRate = fromBreakdown?.wallRate;
      if (typeof wallRate === 'number' && wallRate > 0) return wallRate;
    }
    const civilRate = fromBreakdown?.civilRate;
    if (typeof civilRate === 'number' && civilRate > 0) return civilRate;
    const storedWall = rates?.wall_rates?.[floor.floorId];
    if (floor.costKind === 'wall' && typeof storedWall === 'number' && storedWall > 0) {
      return storedWall;
    }
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
    const enteredRate = civilRates[index] ?? 0;
    const isWall = floor.costKind === 'wall';
    const civilRate = isWall ? 0 : enteredRate;
    const wallRate = isWall ? enteredRate : 0;
    const flooringRate = floor.includeFlooring
      ? (flooringRates?.[floor.floorId] ?? 0)
      : 0;
    const civilCost = isWall ? 0 : computeMistriFloorCivilCost(floor.slabAreaSqft, civilRate);
    const wallCost = isWall ? computeMistriFloorWallCost(floor.wallAreaSqft, wallRate) : 0;
    const flooringCost = floor.includeFlooring
      ? computeMistriFloorFlooringCost(floor.flooringAreaSqft, flooringRate)
      : 0;
    const floorTotal = civilCost + wallCost + flooringCost;
    return {
      floorId: floor.floorId,
      label: floor.label,
      slabAreaSqft: floor.slabAreaSqft,
      civilRate,
      civilCost,
      costKind: floor.costKind,
      ...(isWall
        ? {
            wallAreaSqft: floor.wallAreaSqft,
            wallRate,
            wallCost,
          }
        : {}),
      ...(floor.includeFlooring
        ? {
            flooringAreaSqft: floor.flooringAreaSqft,
            flooringRate,
            flooringCost,
            flooringMaterial: floor.flooringMaterialLabel ?? 'Flooring',
          }
        : {}),
      floorTotal,
    };
  });
  const totalCivilOnly = floor_civil_breakdown.reduce((sum, row) => sum + row.civilCost, 0);
  const total_wall_cost = floor_civil_breakdown.reduce(
    (sum, row) => sum + (row.wallCost ?? 0),
    0,
  );
  const total_flooring_cost = floor_civil_breakdown.reduce(
    (sum, row) => sum + (row.flooringCost ?? 0),
    0,
  );
  const total_project_cost = totalCivilOnly + total_wall_cost + total_flooring_cost;
  const flooring_rates: Record<string, number> = {};
  for (const floor of floors) {
    if (!floor.includeFlooring) continue;
    const rate = flooringRates?.[floor.floorId] ?? 0;
    if (rate > 0) flooring_rates[floor.floorId] = rate;
  }
  const wall_rates: Record<string, number> = {};
  floors.forEach((floor, index) => {
    if (floor.costKind !== 'wall') return;
    const rate = civilRates[index] ?? 0;
    if (rate > 0) wall_rates[floor.floorId] = rate;
  });
  const firstFlooringRate = Object.values(flooring_rates)[0];

  return {
    ground_rate: civilRates[0] ?? 0,
    first_rate: civilRates[1] != null ? civilRates[1] : undefined,
    second_rate: civilRates[2] != null ? civilRates[2] : undefined,
    third_rate: civilRates[3] != null ? civilRates[3] : undefined,
    bid_unit: 'per_sqft',
    total_civil_cost: total_project_cost,
    total_wall_cost,
    total_flooring_cost,
    total_project_cost,
    floor_civil_breakdown,
    ...(Object.keys(flooring_rates).length > 0 ? { flooring_rates } : {}),
    ...(Object.keys(wall_rates).length > 0 ? { wall_rates } : {}),
    ...(firstFlooringRate != null && firstFlooringRate > 0
      ? { tile_fitting_rate: firstFlooringRate }
      : {}),
  };
}

export function mistriRankMetric(bid: {
  total_sum_metric?: number | null;
  rates?: Partial<BidRates> | null;
}): number {
  const projectCost = bid.rates?.total_project_cost;
  if (typeof projectCost === 'number' && Number.isFinite(projectCost) && projectCost > 0) {
    return projectCost;
  }

  const breakdown = Array.isArray(bid.rates?.floor_civil_breakdown)
    ? bid.rates.floor_civil_breakdown
    : [];
  if (breakdown.length > 0) {
    const fromRows = breakdown.reduce((sum, row) => {
      const floorTotal =
        typeof row.floorTotal === 'number' && row.floorTotal > 0
          ? row.floorTotal
          : floorPrimaryCost(row) + Number(row.flooringCost || 0);
      return sum + floorTotal;
    }, 0);
    if (fromRows > 0) return fromRows;
  }

  const stored = bid.rates?.total_civil_cost;
  if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
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
    return breakdown.flatMap((row) => {
      const entries: Array<{ label: string; value: number; suffix?: string }> = [];
      const isWallRow = row.costKind === 'wall' || ((row.wallCost ?? 0) > 0 && !(row.civilCost > 0));
      if (isWallRow) {
        entries.push({
          label: `${row.label} · Wall · ${Number(row.wallAreaSqft || 0).toLocaleString('en-IN')} sqft × ₹${Number(row.wallRate || floorPrimaryRate(row)).toLocaleString('en-IN')}`,
          value: Number(row.wallCost || 0),
          suffix: '',
        });
      } else if (row.civilRate > 0 || row.civilCost > 0) {
        entries.push({
          label: `${row.label} · ${Number(row.slabAreaSqft || 0).toLocaleString('en-IN')} sqft × ₹${Number(row.civilRate || 0).toLocaleString('en-IN')}`,
          value: Number(row.civilCost || 0),
          suffix: '',
        });
      }
      if ((row.flooringRate ?? 0) > 0 || (row.flooringCost ?? 0) > 0) {
        const material = row.flooringMaterial || 'Flooring';
        entries.push({
          label: `${row.label} · ${material} Fitting · ${Number(row.flooringAreaSqft || 0).toLocaleString('en-IN')} sqft × ₹${Number(row.flooringRate || 0).toLocaleString('en-IN')}`,
          value: Number(row.flooringCost || 0),
          suffix: '',
        });
      }
      return entries;
    });
  }

  const sourceFloors = floors ?? [];
  const civilRates = civilRatesFromBid(rates, sourceFloors);
  return sourceFloors.flatMap((floor, index) => {
    const rate = civilRates[index] ?? 0;
    if (!(rate > 0)) return [];
    if (floor.costKind === 'wall') {
      return [{
        label: `${floor.label} · Wall · ${floor.wallAreaSqft.toLocaleString('en-IN')} sqft × ₹${rate.toLocaleString('en-IN')}`,
        value: computeMistriFloorWallCost(floor.wallAreaSqft, rate),
        suffix: '',
      }];
    }
    return [{
      label: `${floor.label} · ${floor.slabAreaSqft.toLocaleString('en-IN')} sqft × ₹${rate.toLocaleString('en-IN')}`,
      value: computeMistriFloorCivilCost(floor.slabAreaSqft, rate),
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
    return breakdown.flatMap((row) => {
      const rate = floorPrimaryRate(row);
      if (!(rate > 0)) return [];
      return [{ label: row.label, rate }];
    });
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
    const isWall = floor.costKind === 'wall';
    if (isWall) {
      if (!(floor.wallAreaSqft > 0)) {
        return { valid: false, message: `Wall area is missing for ${floor.label}.` };
      }
    } else if (!(floor.slabAreaSqft > 0)) {
      return { valid: false, message: 'Built-up area is missing for this project.' };
    }
    const rate = civilRates[index];
    if (rate == null || rate <= 0) {
      return {
        valid: false,
        message: isWall
          ? `Enter a wall construction & plastering rate for ${floor.label}.`
          : `Enter a civil construction rate for ${floor.label}.`,
      };
    }
    const fieldError = getBidRateFieldError(rate, rules);
    if (fieldError) return { valid: false, message: fieldError };
  }

  for (const floor of floors) {
    if (!floor.includeFlooring) continue;
    if (!(floor.flooringAreaSqft > 0)) {
      return {
        valid: false,
        message: `Flooring work area is missing for ${floor.label}.`,
      };
    }
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

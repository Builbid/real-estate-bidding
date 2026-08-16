import {
  ASSAM_BUILDING_TYPE,
  getFloorDisplayName,
  sortBuildingTypes,
  type BuildingType,
} from '@/lib/buildingConfig';
import {
  formatMistriFloorWorkLabel,
  parseMistriDetails,
  sortMistriFloorWork,
} from '@/lib/mistriDetails';
import type { BidFloorRateKey, BidRates, SubConfiguration, TrackType } from '@/lib/types';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import { getFloorInputCount, getFloorLabels } from '@/lib/utils';

export const FLOOR_RATE_LABELS: Record<BidFloorRateKey, string> = {
  ground_rate: 'Ground Floor',
  first_rate: 'First Floor',
  second_rate: 'Second Floor',
};

const FLOOR_RATE_KEYS: BidFloorRateKey[] = ['ground_rate', 'first_rate', 'second_rate'];

export interface BidFloorRateEntry {
  key: BidFloorRateKey;
  label: string;
  value: number;
}

/** Supabase JSONB may arrive as a string on some clients — normalize before reading. */
export function normalizeBidRates(rates: unknown): Partial<BidRates> {
  if (!rates) return {};
  if (typeof rates === 'string') {
    try {
      return JSON.parse(rates) as Partial<BidRates>;
    } catch {
      return {};
    }
  }
  if (typeof rates === 'object') return rates as Partial<BidRates>;
  return {};
}

export function getBidFloorRateEntries(
  rates: Partial<BidRates> | null | undefined | unknown,
  floorLabels?: string[],
): BidFloorRateEntry[] {
  const normalized = normalizeBidRates(rates);

  return FLOOR_RATE_KEYS.flatMap((key, index) => {
    const value = normalized[key];
    if (value === undefined || value === null || value <= 0) return [];
    return [{
      key,
      label: floorLabels?.[index] || FLOOR_RATE_LABELS[key],
      value,
    }];
  });
}

export function hasMultiFloorBidRates(rates: Partial<BidRates> | null | undefined | unknown): boolean {
  return getBidFloorRateEntries(rates).length > 1;
}

export function shouldShowBidFloorBreakdown(
  rates: Partial<BidRates> | null | undefined | unknown,
  projectFloorCount: number,
): boolean {
  const entries = getBidFloorRateEntries(rates);
  if (entries.length === 0) return false;
  if (entries.length > 1) return true;
  return projectFloorCount > 1;
}

export function resolveProjectFloorCount(project: {
  total_floors?: number | null;
  track_type: TrackType;
  sub_configuration?: SubConfiguration | null;
  building_types?: string[] | null;
}): number {
  if (project.total_floors != null && project.total_floors > 0) {
    return Math.min(project.total_floors, 3);
  }

  const sub = project.sub_configuration ?? {};
  if (sub.floors?.length) return Math.min(sub.floors.length, 3);

  if (project.building_types?.length) {
    const rccFloors = project.building_types.filter((type) => type.startsWith('RCC')).length;
    if (rccFloors > 0) return Math.min(rccFloors, 3);
  }

  return getFloorInputCount(project.track_type, sub);
}

function toRateInputLabel(raw: string): string {
  return raw.replace(/^RCC\s+/i, '').trim() || raw;
}

export interface ProjectBidFloors {
  labels: string[];
  count: number;
  isAssamType: boolean;
}

/**
 * Floor rate inputs must match the owner's selected floors
 * (e.g. RCC 2nd + RCC 3rd → "2nd Floor", "3rd Floor"), not a
 * positional Ground / First / Second sequence.
 */
export function resolveProjectBidFloors(project: {
  track_type: TrackType;
  total_floors?: number | null;
  sub_configuration?: SubConfiguration | null;
  building_types?: string[] | null;
  mistri_details?: unknown;
}): ProjectBidFloors {
  const isAssamType =
    project.track_type === 'AssamType' ||
    (project.building_types?.includes(ASSAM_BUILDING_TYPE) ?? false);

  if (isAssamType) {
    return {
      labels: ['Assam Type House Construction'],
      count: 1,
      isAssamType: true,
    };
  }

  const mistri = parseMistriDetails(
    readNestedProjectDetail(project, 'mistri_details'),
  );
  if (mistri?.floorWork && mistri.floorWork.length > 0) {
    const labels = sortMistriFloorWork(mistri.floorWork)
      .slice(0, 3)
      .map((fw) => toRateInputLabel(formatMistriFloorWorkLabel(fw)));
    if (labels.length > 0) {
      return { labels, count: labels.length, isAssamType: false };
    }
  }

  const rccTypes = sortBuildingTypes(
    (project.building_types ?? []).filter(
      (type): type is BuildingType =>
        typeof type === 'string' && type.startsWith('RCC'),
    ),
  ).slice(0, 3);

  if (rccTypes.length > 0) {
    const labels = rccTypes.map((type) => getFloorDisplayName(type));
    return { labels, count: labels.length, isAssamType: false };
  }

  const count = resolveProjectFloorCount(project);
  return { labels: getFloorLabels(count), count, isAssamType: false };
}

import type { BidRates, SubConfiguration, TrackType } from '@/lib/types';
import { getFloorInputCount } from '@/lib/utils';

export const FLOOR_RATE_LABELS: Record<keyof BidRates, string> = {
  ground_rate: 'Ground Floor',
  first_rate: 'First Floor',
  second_rate: 'Second Floor',
};

const FLOOR_RATE_KEYS: Array<keyof BidRates> = ['ground_rate', 'first_rate', 'second_rate'];

export interface BidFloorRateEntry {
  key: keyof BidRates;
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
): BidFloorRateEntry[] {
  const normalized = normalizeBidRates(rates);

  return FLOOR_RATE_KEYS.filter((key) => {
    const value = normalized[key];
    return value !== undefined && value !== null && value > 0;
  }).map((key) => ({
    key,
    label: FLOOR_RATE_LABELS[key],
    value: normalized[key] as number,
  }));
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

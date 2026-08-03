import type { BidRates } from '@/lib/types';

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

export function getBidFloorRateEntries(
  rates: Partial<BidRates> | null | undefined,
): BidFloorRateEntry[] {
  if (!rates) return [];

  return FLOOR_RATE_KEYS.filter((key) => {
    const value = rates[key];
    return value !== undefined && value !== null && value > 0;
  }).map((key) => ({
    key,
    label: FLOOR_RATE_LABELS[key],
    value: rates[key] as number,
  }));
}

export function hasMultiFloorBidRates(rates: Partial<BidRates> | null | undefined): boolean {
  return getBidFloorRateEntries(rates).length > 1;
}

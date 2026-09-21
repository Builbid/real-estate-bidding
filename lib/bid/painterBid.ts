import type { BidFloorRateKey, BidRates } from '@/lib/types';
import { toRateNumber } from '@/lib/validation/bidRates';
import type { PainterBidFloor } from '@/lib/painterDetails';

const FLOOR_RATE_KEYS: BidFloorRateKey[] = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'];

export function painterBidFloorsForKeys(floors: PainterBidFloor[]): PainterBidFloor[] {
  return floors.slice(0, FLOOR_RATE_KEYS.length);
}

export function buildPainterFloorRatePayload(
  floors: PainterBidFloor[],
  rates: Partial<BidRates>,
): Partial<BidRates> {
  const scoped = painterBidFloorsForKeys(floors);
  const breakdown = scoped.map((floor, index) => {
    const key = FLOOR_RATE_KEYS[index];
    const fromKey = key ? toRateNumber(rates[key]) : 0;
    const fromMap = toRateNumber(rates.floor_rates?.[floor.id]);
    return {
      floorId: floor.id,
      label: floor.label,
      rate: fromKey > 0 ? fromKey : fromMap,
    };
  });
  const positive = breakdown.filter((row) => row.rate > 0);
  const average =
    positive.length > 0
      ? positive.reduce((sum, row) => sum + row.rate, 0) / positive.length
      : 0;
  const floor_rates = Object.fromEntries(breakdown.map((row) => [row.floorId, row.rate]));
  const keyed: Partial<Record<BidFloorRateKey, number>> = {};
  scoped.forEach((floor, index) => {
    const key = FLOOR_RATE_KEYS[index];
    if (!key) return;
    keyed[key] = breakdown[index]?.rate ?? 0;
  });
  return {
    ...keyed,
    bid_unit: 'per_sqft',
    floor_rate_breakdown: breakdown,
    floor_rates,
    average_rate: average,
  };
}

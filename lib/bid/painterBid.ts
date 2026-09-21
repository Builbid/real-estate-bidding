import type { BidFloorRateKey, BidRates } from '@/lib/types';
import { toRateNumber } from '@/lib/validation/bidRates';
import type { PainterBidFloor } from '@/lib/painterDetails';

const FLOOR_RATE_KEYS: BidFloorRateKey[] = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'];

export function painterBidFloorsForKeys(floors: PainterBidFloor[]): PainterBidFloor[] {
  return floors.slice(0, FLOOR_RATE_KEYS.length);
}

export function computeFloorEstimatedAmount(areaSqft: number, rate: number): number {
  if (!(areaSqft > 0) || !(rate > 0)) return 0;
  return Math.round(areaSqft * rate);
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
    const rate = fromKey > 0 ? fromKey : fromMap;
    const areaSqft = Number(floor.areaSqft) > 0 ? Number(floor.areaSqft) : 0;
    const amount = computeFloorEstimatedAmount(areaSqft, rate);
    return {
      floorId: floor.id,
      label: floor.label,
      rate,
      areaSqft,
      amount,
    };
  });
  const positive = breakdown.filter((row) => row.rate > 0);
  const average =
    positive.length > 0
      ? positive.reduce((sum, row) => sum + row.rate, 0) / positive.length
      : 0;
  const floor_rates = Object.fromEntries(breakdown.map((row) => [row.floorId, row.rate]));
  const floor_amounts = Object.fromEntries(
    breakdown.filter((row) => row.amount > 0).map((row) => [row.floorId, row.amount]),
  );
  const total_estimated_cost = breakdown.reduce((sum, row) => sum + row.amount, 0);
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
    ...(Object.keys(floor_amounts).length > 0 ? { floor_amounts } : {}),
    average_rate: average,
    ...(total_estimated_cost > 0
      ? {
          total_estimated_cost,
          total_project_cost: total_estimated_cost,
        }
      : {}),
  };
}

export function getPainterFloorCostDisplayEntries(
  rates: Partial<BidRates> | null | undefined,
  floors?: PainterBidFloor[],
): Array<{ label: string; value: number; suffix?: string }> {
  const source = floors && floors.length > 0
    ? buildPainterFloorRatePayload(floors, rates ?? {})
    : rates;
  const breakdown = Array.isArray(source?.floor_rate_breakdown)
    ? source.floor_rate_breakdown
    : [];
  return breakdown.flatMap((row) => {
    const rate = Number(row.rate || 0);
    if (!(rate > 0)) return [];
    const area = Number(row.areaSqft || 0);
    const amount = Number(row.amount || 0) || computeFloorEstimatedAmount(area, rate);
    if (area > 0 && amount > 0) {
      return [{
        label: `${row.label} · ${area.toLocaleString('en-IN')} sqft × ₹${rate.toLocaleString('en-IN')}`,
        value: amount,
        suffix: '',
      }];
    }
    return [{
      label: row.label || 'Floor',
      value: rate,
      suffix: '/sqft',
    }];
  });
}

import type { Bid, BidRates, ServiceType } from '@/lib/types';
import { buildPainterFloorRatePayload, computeFloorEstimatedAmount } from '@/lib/bid/painterBid';
import { mistriRankMetric } from '@/lib/bid/mistriCivilCost';
import type { PainterBidFloor } from '@/lib/painterDetails';
import { toRateNumber } from '@/lib/validation/bidRates';

export interface BidRankContext {
  serviceType?: ServiceType | string | null;
  painterFloors?: PainterBidFloor[];
  painterAreaSqft?: number | null;
  floorAreaSqft?: number | null;
}

function positiveAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Stored or recomputed total estimated project cost used for ranking (lowest wins). */
export function getBidRankMetric(
  bid: {
    total_sum_metric?: number | null;
    single_rate?: number | null;
    rates?: Partial<BidRates> | null;
  },
  ctx?: BidRankContext | null,
): number {
  const rates = bid.rates ?? {};

  if (ctx?.painterFloors && ctx.painterFloors.length > 0) {
    const computed = buildPainterFloorRatePayload(ctx.painterFloors, rates);
    const total = positiveAmount(computed.total_estimated_cost);
    if (total > 0) return total;
  }

  if (ctx?.painterAreaSqft && ctx.painterAreaSqft > 0) {
    const rate = toRateNumber(rates.ground_rate ?? bid.single_rate);
    const total = computeFloorEstimatedAmount(ctx.painterAreaSqft, rate);
    if (total > 0) return total;
  }

  const stored = [
    rates.total_estimated_cost,
    rates.total_project_cost,
    rates.total_civil_cost,
    rates.total_bid_amount,
  ];
  for (const value of stored) {
    const amount = positiveAmount(value);
    if (amount > 0) return amount;
  }

  const floorAmounts = rates.floor_amounts;
  if (floorAmounts && typeof floorAmounts === 'object') {
    const sum = Object.values(floorAmounts).reduce((acc, value) => acc + positiveAmount(value), 0);
    if (sum > 0) return sum;
  }

  const breakdown = Array.isArray(rates.floor_rate_breakdown) ? rates.floor_rate_breakdown : [];
  if (breakdown.length > 0) {
    const fromRows = breakdown.reduce(
      (sum, row) => sum + positiveAmount(row.amount),
      0,
    );
    if (fromRows > 0) return fromRows;
  }

  if (Array.isArray(rates.floor_civil_breakdown) && rates.floor_civil_breakdown.length > 0) {
    const mistri = mistriRankMetric(bid);
    if (mistri > 0) return mistri;
  }

  if (ctx?.serviceType === 'construction_firm' && ctx.floorAreaSqft && ctx.floorAreaSqft > 0) {
    const rate = toRateNumber(bid.single_rate ?? rates.ground_rate);
    const total = computeFloorEstimatedAmount(ctx.floorAreaSqft, rate);
    if (total > 0) return total;
  }

  const weighted = positiveAmount(rates.weighted_index);
  if (weighted > 0) return weighted;

  return Number(bid.total_sum_metric ?? 0);
}

export function sortBidsByEstimatedCost<T extends {
  total_sum_metric?: number | null;
  single_rate?: number | null;
  rates?: Partial<BidRates> | null;
}>(bids: T[], ctx?: BidRankContext | null): T[] {
  return [...bids].sort((a, b) => getBidRankMetric(a, ctx) - getBidRankMetric(b, ctx));
}

export function getBidTotalEstimatedCost(
  bid: Bid | { total_sum_metric?: number | null; rates?: Partial<BidRates> | null },
  ctx?: BidRankContext | null,
): number {
  return getBidRankMetric(bid, ctx);
}

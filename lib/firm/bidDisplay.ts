import type { Bid } from '@/lib/types';
import { formatIndianCompact } from '@/lib/formatIndianCurrency';

/** Display rate for any bid — firm uses single_rate when present */
export function getBidDisplayRate(bid: Bid): number {
  const rate = bid.single_rate ?? bid.total_sum_metric ?? bid.rates?.ground_rate;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function formatBidRatePerSqft(bid: Bid): string {
  const rate = getBidDisplayRate(bid);
  if (rate <= 0) return '—';
  return `₹${rate.toLocaleString('en-IN')}/sqft`;
}

export function formatEstimatedTotal(rate: number, floorAreaSqft: number | null | undefined): string | null {
  if (!floorAreaSqft || floorAreaSqft <= 0) return null;
  const total = rate * floorAreaSqft;
  return formatIndianCompact(total);
}

export function formatEstimatedTotalLabel(rate: number, floorAreaSqft: number): string {
  const total = formatIndianCompact(rate * floorAreaSqft);
  return `${total} (₹${rate.toLocaleString('en-IN')} × ${floorAreaSqft.toLocaleString('en-IN')} sqft)`;
}

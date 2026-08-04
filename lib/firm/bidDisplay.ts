import type { Bid, PackageBidPrice } from '@/lib/types';
import { formatIndianCompact } from '@/lib/formatIndianCurrency';

/**
 * Display rate for any bid — legacy fallback only. Construction firm bids
 * now carry per-package prices (see `package_rates`); this single figure is
 * an internal ranking average and should not be shown as "the" bid rate.
 */
export function getBidDisplayRate(bid: Bid): number {
  const rate = bid.single_rate ?? bid.total_sum_metric ?? bid.rates?.ground_rate;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function formatBidRatePerSqft(bid: Bid): string {
  const rate = getBidDisplayRate(bid);
  if (rate <= 0) return '—';
  return `₹${rate.toLocaleString('en-IN')}/sqft`;
}

/** All package prices for a firm bid, or an empty array for legacy/no-package bids. */
export function getPackageRates(bid: Bid): PackageBidPrice[] {
  return Array.isArray(bid.package_rates) ? bid.package_rates : [];
}

/**
 * Compact ₹/sqft range across a firm's package prices, e.g. "₹1,450 – ₹2,100/sqft".
 * Never reveals the average — only the lowest and highest package price.
 */
export function formatPackageRateRange(packageRates: PackageBidPrice[] | null | undefined): string | null {
  if (!packageRates || packageRates.length === 0) return null;
  const rates = packageRates
    .map((p) => p.rate)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r > 0);
  if (rates.length === 0) return null;

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min === max) return `₹${min.toLocaleString('en-IN')}/sqft`;
  return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}/sqft`;
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

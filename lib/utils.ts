import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  CountdownTime, BidRates, TrackType, SubConfiguration,
} from './types';
import { getMatrixOptionLabel, getFloorCountForRCC } from './constructionMatrix';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Countdown Timer ────────────────────────────────────────
export function getCountdown(targetDateISO: string): CountdownTime {
  const now = Date.now();
  const target = new Date(targetDateISO).getTime();
  const diff = Math.max(0, target - now);

  if (diff === 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, isExpired: false };
}

export function formatCountdown({ hours, minutes, seconds }: CountdownTime): string {
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

// ─── Currency Formatting ────────────────────────────────────
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(value: number): string {
  return `₹${value.toLocaleString('en-IN')}/sqft`;
}

// ─── Bid Metric Calculation ─────────────────────────────────
export function computeTotalMetric(rates: Partial<BidRates>): number {
  return (
    (rates.ground_rate ?? 0) +
    (rates.first_rate ?? 0) +
    (rates.second_rate ?? 0)
  );
}

/** Average of the selected floor rates (sum / number of selected floors). */
export function computeAverageMetric(rates: Partial<BidRates>, floorCount: number): number {
  if (floorCount <= 0) return 0;
  const keys = getRateKeys(floorCount);
  const sum = keys.reduce((acc, key) => acc + (rates[key] ?? 0), 0);
  if (sum <= 0) return 0;
  return sum / floorCount;
}

/** Convert a stored sum metric into the displayed average for `floorCount` floors. */
export function averageFromSumMetric(totalSumMetric: number, floorCount: number): number {
  if (floorCount <= 0) return totalSumMetric;
  return totalSumMetric / floorCount;
}

export function formatBidMetric(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

// ─── Project floor inputs resolver ──────────────────────────
export function getFloorInputCount(
  trackType: TrackType,
  subConfig: SubConfiguration
): number {
  if (trackType === 'AssamType') return 1;
  const cfg = subConfig.rcc_config;
  if (!cfg) return 1;
  return getFloorCountForRCC(cfg);
}

export function getFloorLabels(count: number): string[] {
  const labels = ['Ground Floor', 'First Floor', 'Second Floor'];
  return labels.slice(0, count);
}

export function getRateKeys(count: number): Array<keyof BidRates> {
  const keys: Array<keyof BidRates> = ['ground_rate', 'first_rate', 'second_rate'];
  return keys.slice(0, count);
}

import type { ProjectStatus } from './types';

export type ProjectPhase = 'live' | 'transitioning' | 'select' | 'done';

/** Display phase for owner dashboard / project pages (timestamp-aware). */
export function getProjectPhase(project: {
  status: ProjectStatus;
  bidding_ends_at: string;
}): ProjectPhase {
  const now = new Date();
  if (project.status === 'active_24h') {
    return new Date(project.bidding_ends_at) > now ? 'live' : 'transitioning';
  }
  if (project.status === 'frozen_24h') return 'select';
  return 'done';
}

/** True while bidding or builder selection is in progress on the dashboard. */
export function isInteractiveProjectPhase(phase: ProjectPhase): boolean {
  return phase === 'live' || phase === 'transitioning' || phase === 'select';
}

// ─── Status helpers ─────────────────────────────────────────
export const STATUS_CONFIG = {
  active_24h:  { label: 'Live Bidding',  color: 'emerald', badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' },
  frozen_24h:  { label: 'Frozen',        color: 'indigo',  badge: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-400' },
  completed:   { label: 'Completed',     color: 'slate',   badge: 'bg-secondary text-secondary-foreground border-border' },
  cancelled:   { label: 'Cancelled',     color: 'red',     badge: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400' },
} as const;

export function formatRelativeTime(dateISO: string | null | undefined): string {
  if (!dateISO) return '—';
  const ts = new Date(dateISO).getTime();
  if (!Number.isFinite(ts)) return '—';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Full date + time when a project was posted (Indian locale). */
export function formatProjectPostedAt(dateISO: string | null | undefined): string | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Relative posted time for cards — "2 hours ago" or "on 5 July 2026". */
export function formatProjectPostedDisplay(dateISO: string | null | undefined): string | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  const ts = d.getTime();
  if (!Number.isFinite(ts)) return null;

  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return `on ${d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

// ─── Track type display ─────────────────────────────────────
export const TRACK_LABELS: Record<TrackType, string> = {
  RCC:       'RCC Construction',
  AssamType: 'Assam Type Construction',
};

/** Human-readable construction type chosen by the owner (track + config). */
export function getConstructionLabel(
  trackType: TrackType,
  subConfig: SubConfiguration,
): string {
  const cfg = getMatrixOptionLabel(trackType, subConfig);
  return `${TRACK_LABELS[trackType]} · ${cfg}`;
}

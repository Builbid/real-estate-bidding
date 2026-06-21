import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CountdownTime, BidRates, TrackType, SubConfiguration } from './types';

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

// ─── Project floor inputs resolver ──────────────────────────
export function getFloorInputCount(
  trackType: TrackType,
  subConfig: SubConfiguration
): number {
  if (trackType === 'AssamType') return 1;
  const cfg = subConfig.rcc_config;
  if (!cfg) return 1;
  if (cfg === 'ground_only') return 1;
  if (cfg.startsWith('g_plus_1')) return 2;
  return 3;
}

export function getFloorLabels(count: number): string[] {
  const labels = ['Ground Floor', 'First Floor', 'Second Floor'];
  return labels.slice(0, count);
}

export function getRateKeys(count: number): Array<keyof BidRates> {
  const keys: Array<keyof BidRates> = ['ground_rate', 'first_rate', 'second_rate'];
  return keys.slice(0, count);
}

// ─── Status helpers ─────────────────────────────────────────
export const STATUS_CONFIG = {
  active_24h:  { label: 'Live Bidding',  color: 'emerald', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  frozen_24h:  { label: 'Frozen',        color: 'indigo',  badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  completed:   { label: 'Completed',     color: 'slate',   badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  cancelled:   { label: 'Cancelled',     color: 'red',     badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
} as const;

export function formatRelativeTime(dateISO: string): string {
  const diff = Date.now() - new Date(dateISO).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Track type display ─────────────────────────────────────
export const TRACK_LABELS: Record<TrackType, string> = {
  RCC:       'RCC Construction',
  AssamType: 'Assam Type Construction',
};

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FLOOR_TONES = [
  {
    card: 'border-sky-400/80 bg-gradient-to-br from-sky-100 via-sky-50/90 to-white shadow-md shadow-sky-200/60 dark:from-sky-950/55 dark:via-sky-950/25 dark:to-card dark:border-sky-500/40 dark:shadow-none',
    bar: 'bg-sky-500',
    badge:
      'border-sky-500/40 bg-sky-600 text-white dark:bg-sky-500/25 dark:text-sky-200 dark:border-sky-400/40',
    category: 'text-sky-700 dark:text-sky-300',
    estimate: 'text-sky-800 dark:text-sky-300',
  },
  {
    card: 'border-violet-400/80 bg-gradient-to-br from-violet-100 via-violet-50/90 to-white shadow-md shadow-violet-200/60 dark:from-violet-950/55 dark:via-violet-950/25 dark:to-card dark:border-violet-500/40 dark:shadow-none',
    bar: 'bg-violet-500',
    badge:
      'border-violet-500/40 bg-violet-600 text-white dark:bg-violet-500/25 dark:text-violet-200 dark:border-violet-400/40',
    category: 'text-violet-700 dark:text-violet-300',
    estimate: 'text-violet-800 dark:text-violet-300',
  },
  {
    card: 'border-amber-400/80 bg-gradient-to-br from-amber-100 via-amber-50/90 to-white shadow-md shadow-amber-200/60 dark:from-amber-950/55 dark:via-amber-950/25 dark:to-card dark:border-amber-500/40 dark:shadow-none',
    bar: 'bg-amber-500',
    badge:
      'border-amber-500/40 bg-amber-600 text-white dark:bg-amber-500/25 dark:text-amber-200 dark:border-amber-400/40',
    category: 'text-amber-800 dark:text-amber-300',
    estimate: 'text-amber-900 dark:text-amber-300',
  },
  {
    card: 'border-rose-400/80 bg-gradient-to-br from-rose-100 via-rose-50/90 to-white shadow-md shadow-rose-200/60 dark:from-rose-950/55 dark:via-rose-950/25 dark:to-card dark:border-rose-500/40 dark:shadow-none',
    bar: 'bg-rose-500',
    badge:
      'border-rose-500/40 bg-rose-600 text-white dark:bg-rose-500/25 dark:text-rose-200 dark:border-rose-400/40',
    category: 'text-rose-700 dark:text-rose-300',
    estimate: 'text-rose-800 dark:text-rose-300',
  },
  {
    card: 'border-teal-400/80 bg-gradient-to-br from-teal-100 via-teal-50/90 to-white shadow-md shadow-teal-200/60 dark:from-teal-950/55 dark:via-teal-950/25 dark:to-card dark:border-teal-500/40 dark:shadow-none',
    bar: 'bg-teal-500',
    badge:
      'border-teal-500/40 bg-teal-600 text-white dark:bg-teal-500/25 dark:text-teal-200 dark:border-teal-400/40',
    category: 'text-teal-700 dark:text-teal-300',
    estimate: 'text-teal-800 dark:text-teal-300',
  },
  {
    card: 'border-indigo-400/80 bg-gradient-to-br from-indigo-100 via-indigo-50/90 to-white shadow-md shadow-indigo-200/60 dark:from-indigo-950/55 dark:via-indigo-950/25 dark:to-card dark:border-indigo-500/40 dark:shadow-none',
    bar: 'bg-indigo-500',
    badge:
      'border-indigo-500/40 bg-indigo-600 text-white dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/40',
    category: 'text-indigo-700 dark:text-indigo-300',
    estimate: 'text-indigo-800 dark:text-indigo-300',
  },
  {
    card: 'border-orange-400/80 bg-gradient-to-br from-orange-100 via-orange-50/90 to-white shadow-md shadow-orange-200/60 dark:from-orange-950/55 dark:via-orange-950/25 dark:to-card dark:border-orange-500/40 dark:shadow-none',
    bar: 'bg-orange-500',
    badge:
      'border-orange-500/40 bg-orange-600 text-white dark:bg-orange-500/25 dark:text-orange-200 dark:border-orange-400/40',
    category: 'text-orange-800 dark:text-orange-300',
    estimate: 'text-orange-900 dark:text-orange-300',
  },
  {
    card: 'border-fuchsia-400/80 bg-gradient-to-br from-fuchsia-100 via-fuchsia-50/90 to-white shadow-md shadow-fuchsia-200/60 dark:from-fuchsia-950/55 dark:via-fuchsia-950/25 dark:to-card dark:border-fuchsia-500/40 dark:shadow-none',
    bar: 'bg-fuchsia-500',
    badge:
      'border-fuchsia-500/40 bg-fuchsia-600 text-white dark:bg-fuchsia-500/25 dark:text-fuchsia-200 dark:border-fuchsia-400/40',
    category: 'text-fuchsia-700 dark:text-fuchsia-300',
    estimate: 'text-fuchsia-800 dark:text-fuchsia-300',
  },
] as const;

const ASSAM_TONE = {
  card: 'border-emerald-400/80 bg-gradient-to-br from-emerald-100 via-emerald-50/90 to-white shadow-md shadow-emerald-200/60 dark:from-emerald-950/55 dark:via-emerald-950/25 dark:to-card dark:border-emerald-500/40 dark:shadow-none',
  bar: 'bg-emerald-500',
  badge:
    'border-emerald-500/40 bg-emerald-600 text-white dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400/40',
  category: 'text-emerald-700 dark:text-emerald-300',
  estimate: 'text-emerald-800 dark:text-emerald-300',
} as const;

export type BidFloorCardTone = (typeof FLOOR_TONES)[number] | typeof ASSAM_TONE;

export function getBidFloorCardTone(options: {
  index?: number | null;
  isAssam?: boolean;
}): BidFloorCardTone | null {
  if (options.isAssam) return ASSAM_TONE;
  if (options.index == null || !Number.isFinite(options.index)) return null;
  return FLOOR_TONES[Math.abs(Math.trunc(options.index)) % FLOOR_TONES.length];
}

export function BidWorkItemCard({
  title,
  category,
  badge,
  description,
  toneIndex,
  isAssam,
  children,
}: {
  title: string;
  category?: string;
  badge?: string;
  description?: string;
  /** Distinct color per floor (0 = Ground, 1 = 1st, …). */
  toneIndex?: number | null;
  isAssam?: boolean;
  children: ReactNode;
}) {
  const tone = getBidFloorCardTone({ index: toneIndex, isAssam });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-2 px-3.5 py-3 space-y-3',
        tone ? tone.card : 'border-border/80 bg-muted/15',
      )}
    >
      {tone ? (
        <div
          className={cn('absolute inset-x-0 top-0 h-1.5', tone.bar)}
          aria-hidden
        />
      ) : null}
      <div className={cn('space-y-1.5 min-w-0', tone && 'pt-1')}>
        {category ? (
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              tone ? tone.category : 'text-muted-foreground',
            )}
          >
            {category}
          </p>
        ) : null}
        <p className="text-base font-bold text-foreground leading-snug tracking-tight">
          {title}
        </p>
        {badge ? (
          <span
            className={cn(
              'inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              tone
                ? tone.badge
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
            )}
          >
            {badge}
          </span>
        ) : null}
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

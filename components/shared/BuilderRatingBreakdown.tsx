'use client';

import type { ComponentType } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { StarRating } from '@/app/dashboard/owner/project/[id]/StarRating';
import { BuilderRatingBadge } from '@/components/shared/BuilderRatingBadge';
import {
  type BuilderRatingStats,
  maskOwnerName,
  ownerInitials,
  starPercentage,
} from '@/lib/builderRatings';
import { cn } from '@/lib/utils';

interface BuilderRatingBreakdownProps {
  stats: BuilderRatingStats;
  className?: string;
}

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

/** Google Play Store-style rating summary with bar chart and metric badges. */
export function BuilderRatingBreakdown({ stats, className }: BuilderRatingBreakdownProps) {
  const { total, positive, negative, average, distribution } = stats;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary header */}
      <div className="flex gap-6">
        <div className="flex flex-col items-center justify-center flex-shrink-0 min-w-[72px]">
          <span className="text-4xl font-bold text-foreground tabular-nums leading-none">
            {total > 0 ? average.toFixed(1) : '—'}
          </span>
          {total > 0 && (
            <>
              <StarRating rating={Math.round(average)} size="sm" className="mt-1.5" />
              <span className="text-[10px] text-muted-foreground mt-1">{total} rating{total !== 1 ? 's' : ''}</span>
            </>
          )}
          {total === 0 && (
            <span className="text-[10px] text-muted-foreground mt-1">No ratings yet</span>
          )}
        </div>

        {/* Bar chart */}
        <div className="flex-1 space-y-1.5">
          {STAR_LEVELS.map((star) => {
            const count = distribution[String(star) as keyof typeof distribution];
            const pct = starPercentage(count, total);
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-3 text-right tabular-nums">{star}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400/80 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground/80 w-7 text-right tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric badges */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          <MetricBadge icon={MessageSquare} label="Total Ratings" value={total} color="slate" />
          <MetricBadge icon={ThumbsUp} label="Positive (4–5★)" value={positive} color="emerald" />
          <MetricBadge icon={ThumbsDown} label="Negative (1–2★)" value={negative} color="rose" />
        </div>
      )}
    </div>
  );
}

function MetricBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'slate' | 'emerald' | 'rose';
}) {
  const colors = {
    slate: 'bg-secondary/60 border-border text-foreground/80',
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300',
    rose: 'bg-rose-500/5 border-rose-500/20 text-rose-300',
  };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs', colors[color])}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

interface BuilderReviewsFeedProps {
  reviews: BuilderRatingStats['reviews'];
  className?: string;
}

/** Chronological owner feedback feed with masked names. */
export function BuilderReviewsFeed({ reviews, className }: BuilderReviewsFeedProps) {
  const withText = reviews.filter((r) => r.review?.trim());

  if (withText.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground/80 px-1', className)}>
        No written reviews yet.
      </p>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {withText.map((r, i) => {
        const masked = maskOwnerName(r.owner_name);
        const initials = ownerInitials(r.owner_name);
        const date = new Date(r.created_at).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        return (
          <div
            key={`${r.created_at}-${i}`}
            className="flex gap-3 px-3 py-3 rounded-xl bg-secondary/40 border border-border"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-indigo-300">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{masked}</span>
                <span className="text-[10px] text-muted-foreground/80">{date}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={r.rating} size="xs" />
                <BuilderRatingBadge average={r.rating} total={1} size="xs" />
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed mt-2">{r.review}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBuilderAverage } from '@/lib/builderRatings';

interface BuilderRatingBadgeProps {
  average: number;
  total?: number;
  size?: 'xs' | 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}

const SIZE = {
  xs: { score: 'text-[10px]', star: 'w-2.5 h-2.5', count: 'text-[9px]' },
  sm: { score: 'text-xs', star: 'w-3 h-3', count: 'text-[10px]' },
  md: { score: 'text-sm', star: 'w-3.5 h-3.5', count: 'text-xs' },
};

/** Compact upfront rating display — e.g. "4.8 ★" for cards and headers. */
export function BuilderRatingBadge({
  average,
  total = 0,
  size = 'sm',
  showCount = false,
  className,
}: BuilderRatingBadgeProps) {
  const s = SIZE[size];
  const label = formatBuilderAverage(average, total);

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 tabular-nums', className)}
      title={total > 0 ? `${label} out of 5 · ${total} rating${total !== 1 ? 's' : ''}` : 'No ratings yet'}
    >
      <span className={cn('font-semibold text-amber-400', s.score)}>{label}</span>
      {total > 0 && (
        <Star className={cn('fill-amber-400 text-amber-400 flex-shrink-0', s.star)} aria-hidden />
      )}
      {showCount && total > 0 && (
        <span className={cn('text-muted-foreground ml-0.5', s.count)}>({total})</span>
      )}
    </span>
  );
}

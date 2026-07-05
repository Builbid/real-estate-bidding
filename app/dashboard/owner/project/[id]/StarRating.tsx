'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  size?: 'xs' | 'sm' | 'md';
  onRate?: (n: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  interactive = false,
  size = 'sm',
  onRate,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = hovered ?? rating;

  const starClass = size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(null)}
          className={cn(
            'focus:outline-none transition-transform',
            interactive && 'cursor-pointer hover:scale-125',
            !interactive && 'cursor-default pointer-events-none'
          )}
          aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              starClass,
              n <= displayed
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted-foreground/40 text-muted-foreground/60'
            )}
          />
        </button>
      ))}
    </div>
  );
}

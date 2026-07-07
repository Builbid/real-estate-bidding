'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { cn } from '@/lib/utils';
import type { DemoFirm } from '@/lib/data/demoFirms';

interface FeaturedFirmCardProps {
  firm: DemoFirm;
  viewPortfolioLabel: string;
  reviewsLabel: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => {
          const starIndex = i + 1;
          const filled = rating >= starIndex;
          const half = !filled && rating >= starIndex - 0.5;
          return (
            <Star
              key={starIndex}
              className={cn(
                'h-3.5 w-3.5',
                filled && 'fill-amber-400 text-amber-400',
                half && 'fill-amber-400/45 text-amber-400',
                !filled && !half && 'text-slate-300 dark:text-slate-600',
              )}
            />
          );
        })}
      </div>
      <span className="text-xs font-semibold text-foreground tabular-nums">{rating.toFixed(1)}</span>
    </div>
  );
}

export function FeaturedFirmCard({ firm, viewPortfolioLabel, reviewsLabel }: FeaturedFirmCardProps) {
  return (
    <article
      className={cn(
        'snap-start flex-shrink-0 w-72 min-w-[280px]',
        'flex flex-col rounded-2xl border border-slate-200 bg-white p-5',
        'dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur',
        'shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-md',
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <FirmLogo companyName={firm.name} logoUrl={firm.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{firm.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{firm.location}</span>
          </p>
        </div>
      </div>

      <div className="mb-3">
        <StarRating rating={firm.rating} />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reviewsLabel}</p>
      </div>

      <Badge
        variant="default"
        className="mb-4 w-fit border-violet-500/20 bg-violet-500/10 text-[11px] text-violet-700 dark:text-violet-300"
      >
        {firm.specialty}
      </Badge>

      <Button
        variant="outline"
        size="sm"
        className={cn(
          'mt-auto w-full group/btn',
          'border-slate-200 bg-slate-50 text-slate-900',
          'hover:border-violet-500/40 hover:bg-violet-50 hover:text-violet-700',
          'dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100',
          'dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-300',
        )}
        asChild
      >
        <Link href={firm.portfolioLink}>
          <span>{viewPortfolioLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </Button>
    </article>
  );
}

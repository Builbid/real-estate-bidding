'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { cn } from '@/lib/utils';
import type { DemoFirm, DemoPartnerType } from '@/lib/data/demoFirms';

interface FeaturedFirmCardProps {
  firm: DemoFirm;
  partnerType: DemoPartnerType;
  viewPortfolioLabel: string;
  reviewsLabel: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-px" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => {
        const starIndex = i + 1;
        const filled = rating >= starIndex;
        const half = !filled && rating >= starIndex - 0.5;
        return (
          <Star
            key={starIndex}
            className={cn(
              'h-2.5 w-2.5',
              filled && 'fill-amber-400 text-amber-400',
              half && 'fill-amber-400/45 text-amber-400',
              !filled && !half && 'text-muted-foreground/30',
            )}
          />
        );
      })}
    </div>
  );
}

export function FeaturedFirmCard({
  firm,
  partnerType,
  viewPortfolioLabel,
  reviewsLabel,
}: FeaturedFirmCardProps) {
  const isLabour = partnerType === 'labour_contractor';

  return (
    <article
      className={cn(
        'surface-card relative snap-start flex w-[172px] min-w-[160px] flex-shrink-0 flex-col gap-2.5 overflow-hidden p-3.5',
        'transition-all duration-300 hover:-translate-y-0.5',
        isLabour
          ? 'hover:border-amber-500/35 hover:shadow-lg hover:shadow-amber-500/[0.08]'
          : 'hover:border-violet-500/35 hover:shadow-lg hover:shadow-violet-500/[0.08]',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-80',
          isLabour ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-violet-400 to-indigo-500',
        )}
      />

      <div className="flex min-w-0 items-center gap-2">
        <FirmLogo
          companyName={firm.name}
          logoUrl={firm.logoUrl}
          size="sm"
          className="!h-10 !w-10 text-[10px] ring-2 ring-background"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
            {firm.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
            <span className="truncate">{firm.location}</span>
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <StarRating rating={firm.rating} />
        <span className="font-semibold tabular-nums text-foreground">
          {firm.rating.toFixed(1)}
        </span>
        <span className="text-border">·</span>
        <span className="truncate">{reviewsLabel}</span>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span
          className={cn(
            'truncate rounded-full px-2 py-0.5 text-xs font-medium leading-none shadow-sm',
            isLabour
              ? 'border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'border border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
          )}
        >
          {firm.specialty}
        </span>
        <Link
          href={firm.portfolioLink}
          aria-label={viewPortfolioLabel}
          className={cn(
            'inline-flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold transition-colors',
            isLabour
              ? 'text-amber-700 hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200'
              : 'text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200',
          )}
        >
          Portfolio
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </article>
  );
}

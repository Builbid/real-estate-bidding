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
              !filled && !half && 'text-slate-300 dark:text-slate-600',
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
        'snap-start flex-shrink-0 w-[172px] min-w-[160px]',
        'flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3',
        'dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur',
        'shadow-sm transition-all duration-200',
        isLabour
          ? 'hover:border-amber-500/30 hover:shadow-md'
          : 'hover:border-violet-500/30 hover:shadow-md',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FirmLogo
          companyName={firm.name}
          logoUrl={firm.logoUrl}
          size="sm"
          className="!w-10 !h-10 text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
            {firm.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
            <span className="truncate">{firm.location}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 min-w-0 text-[10px] text-slate-500 dark:text-slate-400">
        <StarRating rating={firm.rating} />
        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
          {firm.rating.toFixed(1)}
        </span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="truncate">{reviewsLabel}</span>
      </div>

      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span
          className={cn(
            'truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
            isLabour
              ? 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'border border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
          )}
        >
          {firm.specialty}
        </span>
        <Link
          href={firm.portfolioLink}
          aria-label={viewPortfolioLabel}
          className={cn(
            'inline-flex flex-shrink-0 items-center gap-0.5 text-[10px] font-semibold whitespace-nowrap',
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

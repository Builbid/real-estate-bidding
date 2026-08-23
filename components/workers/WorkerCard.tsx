'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { cn } from '@/lib/utils';
import type { RankedWorker } from '@/lib/workers/types';

interface WorkerCardProps {
  worker: RankedWorker;
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
              'h-3.5 w-3.5',
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

export function WorkerCard({ worker }: WorkerCardProps) {
  return (
    <article className="surface-card group relative flex flex-col gap-3 overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/35 hover:shadow-lg hover:shadow-amber-500/[0.08]">
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-80" />

      <div className="flex min-w-0 items-start gap-3">
        <FirmLogo
          companyName={worker.name}
          logoUrl={worker.avatarUrl}
          size="md"
          className="!h-12 !w-12 ring-2 ring-background"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight text-foreground">
            {worker.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{worker.location}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StarRating rating={worker.rating} />
        <span className="font-semibold tabular-nums text-foreground/90">
          {worker.rating.toFixed(1)}
        </span>
        <span className="text-border">·</span>
        <span>
          {worker.reviewsCount} review{worker.reviewsCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
        <span className="truncate rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium leading-none text-amber-700 shadow-sm dark:text-amber-300">
          {worker.categoryLabel}
        </span>
        <Link
          href={worker.portfolioLink}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-700 transition-colors hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
        >
          Portfolio
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

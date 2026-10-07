'use client';

import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { formatYearsExperience } from '@/lib/workers/experience';
import type { RankedWorker } from '@/lib/workers/types';

interface WorkerCardProps {
  worker: RankedWorker;
}

export function WorkerCard({ worker }: WorkerCardProps) {
  const experienceLabel = formatYearsExperience(worker.yearsOfExperience);

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

      {experienceLabel && (
        <p className="inline-flex w-fit items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {experienceLabel}
        </p>
      )}

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

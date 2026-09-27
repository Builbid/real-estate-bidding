'use client';

import { useMemo, useState } from 'react';
import { HardHat } from 'lucide-react';
import {
  PLATFORM_COPY,
  PLATFORM_H1,
  PLATFORM_PAGE_MAIN,
} from '@/components/marketing/StaticPageShell';
import { Navbar } from '@/components/shared/Navbar';
import { WorkerCard } from '@/components/workers/WorkerCard';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { cn } from '@/lib/utils';
import {
  WORKER_CATEGORY_FILTERS,
  sortWorkersByRank,
  type RankedWorker,
  type WorkerCategory,
} from '@/lib/workers/types';

interface WorkersDirectoryContentProps {
  workers: RankedWorker[];
}

export function WorkersDirectoryContent({ workers }: WorkersDirectoryContentProps) {
  const [category, setCategory] = useState<WorkerCategory>('all');

  const filtered = useMemo(() => {
    const list =
      category === 'all' ? workers : workers.filter((w) => w.category === category);
    return sortWorkersByRank(list);
  }, [workers, category]);

  return (
    <>
      <Navbar />
      <main className={PLATFORM_PAGE_MAIN}>
        <HistoryBackButton className="mb-6" />

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={PLATFORM_H1}>Mistri Workers</h1>
            <HardHat className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden />
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              {filtered.length} ranked
            </span>
          </div>
          <p className={cn('mt-3 max-w-prose', PLATFORM_COPY)}>
            Browse verified mistri workers and trade professionals, ranked by rating and
            completed reviews.
          </p>
        </header>

        <div
          className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:mb-8 sm:flex-wrap"
          role="tablist"
          aria-label="Worker categories"
        >
          {WORKER_CATEGORY_FILTERS.map(({ value, label }) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(value)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                    : 'border-border bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {filtered.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No workers in this category yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another trade filter, or check back soon as more professionals join.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

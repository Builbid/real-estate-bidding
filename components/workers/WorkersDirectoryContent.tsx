'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, HardHat } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { WorkerCard } from '@/components/workers/WorkerCard';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
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
      <main className="mx-auto max-w-7xl px-4 py-8 pb-16 sm:px-6 sm:py-10">
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-6')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </NavLink>

        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <HardHat className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Mistri Workers
            </h1>
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              {filtered.length} ranked
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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

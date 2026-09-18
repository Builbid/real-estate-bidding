'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CompletedProjectsFolder({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-xl py-2 text-left transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        {open ? (
          <FolderOpen className="h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
        ) : (
          <Folder className="h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
        )}
        <span className="min-w-0 flex-1 text-sm font-bold text-foreground">
          Completed projects
        </span>
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? <div className="mt-2 pl-1 sm:pl-8">{children}</div> : null}
    </section>
  );
}

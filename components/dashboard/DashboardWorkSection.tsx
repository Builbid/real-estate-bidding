import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  live: {
    shell: 'border-emerald-500/25 bg-emerald-500/[0.05] dark:bg-emerald-500/[0.07]',
    dot: 'bg-emerald-500',
    title: 'text-emerald-800 dark:text-emerald-300',
  },
  select: {
    shell: 'border-amber-500/30 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]',
    dot: 'bg-amber-500',
    title: 'text-amber-800 dark:text-amber-300',
  },
  done: {
    shell: 'border-border bg-muted/50',
    dot: 'bg-slate-400 dark:bg-slate-500',
    title: 'text-slate-700 dark:text-slate-200',
  },
} as const;

export function DashboardWorkSection({
  tone,
  title,
  count,
  description,
  children,
}: {
  tone: keyof typeof TONES;
  title: string;
  count?: number;
  description?: string;
  children: ReactNode;
}) {
  const t = TONES[tone];

  return (
    <section className={cn('rounded-2xl border p-4 sm:p-5', t.shell)}>
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-black/5 pb-3 dark:border-white/10">
        <div className="min-w-0">
          <h2 className={cn('flex items-center gap-2 text-sm font-bold tracking-wide', t.title)}>
            <span
              className={cn('h-2 w-2 flex-shrink-0 rounded-full', t.dot, tone === 'live' && 'animate-pulse')}
            />
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {typeof count === 'number' ? (
          <span className="flex-shrink-0 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
            {count}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

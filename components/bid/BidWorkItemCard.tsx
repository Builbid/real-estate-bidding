'use client';

import { cn } from '@/lib/utils';

export function BidWorkItemCard({
  title,
  category,
  badge,
  description,
  children,
}: {
  title: string;
  category?: string;
  badge?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/80 bg-muted/15 px-3.5 py-3 space-y-3',
      )}
    >
      <div className="space-y-1 min-w-0">
        {category ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </p>
        ) : null}
        <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
        {badge ? (
          <span className="inline-flex w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            {badge}
          </span>
        ) : null}
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

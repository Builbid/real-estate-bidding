'use client';

import { cn } from '@/lib/utils';

export function BidWorkItemCard({
  title,
  category,
  description,
  children,
}: {
  title: string;
  category?: string;
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

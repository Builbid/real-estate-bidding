'use client';

import { PackageInfoButton } from '@/components/firm/PackageInfoButton';
import type { PackageBidPrice } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PackageBidPriceListProps {
  packageRates: PackageBidPrice[];
  highlight?: boolean;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Renders every package price a construction firm bid with, each paired
 * with an "i" info button revealing what that package includes. Firms are
 * ranked by the (hidden) average of these prices — this component never
 * shows that average, only the individual package prices.
 */
export function PackageBidPriceList({
  packageRates,
  highlight = false,
  align = 'end',
  className,
}: PackageBidPriceListProps) {
  if (!packageRates || packageRates.length === 0) {
    return <span className="text-xs text-muted-foreground">No package prices submitted</span>;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      {packageRates.map((entry) => (
        <span
          key={entry.package.id}
          className={cn(
            'inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-md border text-xs font-semibold whitespace-nowrap',
            highlight
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-border bg-secondary/40 text-foreground',
          )}
        >
          <span className="text-muted-foreground font-normal">{entry.package.name}:</span>
          ₹{entry.rate.toLocaleString('en-IN')}/sqft
          <PackageInfoButton pkg={entry.package} />
        </span>
      ))}
    </div>
  );
}

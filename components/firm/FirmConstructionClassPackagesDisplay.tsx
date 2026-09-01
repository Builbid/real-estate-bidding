'use client';

import { PACKAGE_CATEGORIES } from '@/lib/firm/constructionClass';
import type { FirmConstructionPackage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FirmConstructionClassPackagesDisplayProps {
  packages: FirmConstructionPackage[];
  compact?: boolean;
}

export function FirmConstructionClassPackagesDisplay({
  packages,
  compact = false,
}: FirmConstructionClassPackagesDisplayProps) {
  const visiblePackages = packages.filter((pkg) => pkg.name?.trim());

  if (visiblePackages.length === 0) return null;

  return (
    <div className="space-y-3">
      {!compact && (
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Construction Packages
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            What this firm includes in each of its packages
          </p>
        </div>
      )}

      <div
        className={cn(
          'grid gap-3',
          compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2',
        )}
      >
        {visiblePackages.map((pkg) => {
          const filledCategories = PACKAGE_CATEGORIES.filter((c) => pkg[c.key]?.trim());

          return (
            <div key={pkg.id} className="rounded-xl border border-border bg-secondary/20 p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">{pkg.name}</h3>
              <dl className="space-y-2.5">
                {filledCategories.map((category) => (
                  <div key={category.key}>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {category.label}
                    </dt>
                    <dd className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line mt-0.5">
                      {pkg[category.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

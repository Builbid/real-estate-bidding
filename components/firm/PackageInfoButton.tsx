'use client';

import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PACKAGE_CATEGORIES } from '@/lib/firm/constructionClass';
import type { FirmConstructionPackage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PackageInfoButtonProps {
  pkg: FirmConstructionPackage;
  className?: string;
}

export function PackageInfoButton({ pkg, className }: PackageInfoButtonProps) {
  const filledCategories = PACKAGE_CATEGORIES.filter((c) => pkg[c.key]?.trim());

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What's included in ${pkg.name}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors',
            className,
          )}
        >
          <Info className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="text-xs max-w-xs max-h-80 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold text-foreground mb-2">{pkg.name}</p>
        {filledCategories.length === 0 ? (
          <p className="text-muted-foreground">No package details provided.</p>
        ) : (
          <dl className="space-y-2">
            {filledCategories.map((category) => (
              <div key={category.key}>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80">
                  {category.label}
                </dt>
                <dd className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line mt-0.5">
                  {pkg[category.key]}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </PopoverContent>
    </Popover>
  );
}

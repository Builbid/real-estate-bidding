'use client';

import type { BuildingType } from '@/lib/buildingConfig';
import { getSectionHeaderStyle } from '@/lib/buildingConfig';
import { cn } from '@/lib/utils';

interface BuildingSectionHeaderProps {
  buildingType: BuildingType;
  className?: string;
}

export function BuildingSectionHeader({ buildingType, className }: BuildingSectionHeaderProps) {
  const { icon, className: styleClassName } = getSectionHeaderStyle(buildingType);

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2.5 rounded-xl border-l-4 px-5 py-2.5 shadow-sm',
        'text-sm sm:text-base font-bold tracking-wide',
        styleClassName,
        className,
      )}
      role="heading"
      aria-level={3}
    >
      <span className="text-lg sm:text-xl leading-none flex-shrink-0" aria-hidden>
        {icon}
      </span>
      <span>{buildingType}</span>
    </div>
  );
}

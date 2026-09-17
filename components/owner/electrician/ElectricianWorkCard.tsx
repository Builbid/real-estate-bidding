'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { FORM_OPTION_SELECTED, FORM_OPTION_UNSELECTED } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';

export function ElectricianWorkCard({
  selected,
  onClick,
  title,
  subtitle,
  imageUrl,
  imageAlt,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl bg-white text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-1',
        selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
      )}
    >
      <div className="relative h-32 w-full overflow-hidden bg-white sm:h-36">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className={cn(
            'object-cover transition-transform duration-200',
            !selected && 'group-hover:scale-[1.02]',
          )}
        />
        {selected && (
          <span
            className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
            aria-hidden
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className={cn('line-clamp-2 text-[11px] leading-snug sm:text-xs', selected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
          {title}
        </p>
        <p className="line-clamp-2 text-[10px] leading-snug text-slate-500">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

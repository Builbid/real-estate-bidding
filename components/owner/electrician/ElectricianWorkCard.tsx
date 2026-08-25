'use client';

import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
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
        'group relative flex w-full flex-col overflow-hidden rounded-xl border-2 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2',
        selected
          ? 'border-emerald-500 bg-emerald-500/8 shadow-md shadow-emerald-500/15'
          : 'border-border bg-card hover:border-muted-foreground/40 hover:shadow-sm',
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-secondary/40">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className={cn(
            'object-cover transition-transform duration-300',
            !selected && 'group-hover:scale-[1.03]',
          )}
        />
        {selected && (
          <div className="absolute inset-0 bg-emerald-500/10" aria-hidden />
        )}
        {selected && (
          <CheckCircle2
            className="absolute top-2 right-2 h-6 w-6 text-emerald-500 drop-shadow-md dark:text-emerald-400"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="text-xs font-bold leading-snug text-gray-900 dark:text-white sm:text-sm">
          {title}
        </p>
        <p className="text-[10px] font-medium leading-snug text-gray-600 dark:text-zinc-400 sm:text-[11px]">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

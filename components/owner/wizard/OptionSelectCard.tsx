'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OptionSelectCard({
  selected,
  onClick,
  label,
  description,
  multi,
  disabled,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  multi?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative w-full rounded-xl border-2 p-4 pr-10 text-left transition-all duration-200',
        selected
          ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500/15'
          : 'border-border bg-secondary/30 hover:border-blue-500/40',
        disabled && 'cursor-default disabled:opacity-100',
        className,
      )}
    >
      {selected && (
        <CheckCircle2
          className="absolute top-2.5 right-2.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
          aria-hidden
        />
      )}
      <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{label}</p>
      {description && (
        <p className="mt-1 text-xs font-medium text-gray-700 dark:text-zinc-300 leading-snug">
          {description}
        </p>
      )}
      {multi && !selected && (
        <span
          aria-hidden
          className="absolute top-3 right-3 h-4 w-4 rounded-full border border-gray-300 dark:border-zinc-500"
        />
      )}
    </button>
  );
}

export function OptionSelectGrid<T extends string>({
  options,
  value,
  values,
  onSelect,
  onToggle,
  columns = 1,
}: {
  options: { value: T; label: string; description?: string }[];
  value?: T | null;
  values?: readonly T[];
  onSelect?: (value: T) => void;
  onToggle?: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const multi = Boolean(onToggle);
  return (
    <div
      className={cn(
        'grid gap-3',
        columns === 3 && 'grid-cols-1 sm:grid-cols-3',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 1 && 'grid-cols-1',
      )}
    >
      {options.map((opt) => {
        const selected = multi
          ? Boolean(values?.includes(opt.value))
          : value === opt.value;
        return (
          <OptionSelectCard
            key={opt.value}
            selected={selected}
            multi={multi}
            label={opt.label}
            description={opt.description}
            onClick={() => {
              if (onToggle) onToggle(opt.value);
              else onSelect?.(opt.value);
            }}
          />
        );
      })}
    </div>
  );
}

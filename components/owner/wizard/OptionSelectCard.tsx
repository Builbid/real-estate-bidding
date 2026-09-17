'use client';

import { CheckCircle2 } from 'lucide-react';
import { FORM_NOTE, FORM_OPTION_SELECTED, FORM_OPTION_UNSELECTED } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';

function formatOptionNote(text: string) {
  const trimmed = text.trim();
  if (/^\*? ?Note:/i.test(trimmed)) {
    return trimmed.replace(/^\*\s*/, '').trim();
  }
  return `Note: ${trimmed}`;
}

function splitDescriptionNote(description?: string, note?: string) {
  if (note) {
    return { description, note: formatOptionNote(note) };
  }
  if (!description) {
    return { description, note: undefined };
  }
  const match = description.match(/^(.*?)(?:\n|\s)*(\*? ?Note:[\s\S]+)$/i);
  if (!match) {
    return { description, note: undefined };
  }
  return {
    description: match[1].trim() || undefined,
    note: formatOptionNote(match[2]),
  };
}

export function OptionSelectCard({
  selected,
  onClick,
  label,
  description,
  note,
  multi,
  disabled,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  note?: string;
  multi?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const split = splitDescriptionNote(description, note);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-disabled={disabled || undefined}
        className={cn(
          'relative w-full rounded-xl p-4 pr-10 text-left transition-all duration-200',
          selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
          disabled && 'cursor-default disabled:opacity-100',
          className,
        )}
      >
        {selected ? (
          <CheckCircle2
            className="absolute top-2.5 right-2.5 h-5 w-5 flex-shrink-0 text-blue-600"
            aria-hidden
          />
        ) : multi ? (
          <span
            aria-hidden
            className="absolute top-3 right-3 h-4 w-4 rounded-full border-2 border-slate-300"
          />
        ) : (
          <span
            aria-hidden
            className="absolute top-3 right-3 h-4 w-4 rounded-full border-2 border-slate-300"
          />
        )}
        <p className={cn('text-sm leading-snug', selected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{label}</p>
        {split.description && (
          <p className="mt-1 text-xs font-medium leading-snug text-slate-500">
            {split.description}
          </p>
        )}
      </button>
      {split.note ? <p className={FORM_NOTE}>{split.note}</p> : null}
    </div>
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
  options: { value: T; label: string; description?: string; note?: string }[];
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
            note={opt.note}
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

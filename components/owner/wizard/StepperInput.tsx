'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_SECTION_LABEL, withSectionColon } from '@/components/owner/wizard/StartTimeAndNotes';

export function StepperInput({
  label,
  value,
  onChange,
  min = 1,
  max = 3,
  plusAtMax = true,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  plusAtMax?: boolean;
}) {
  const display = plusAtMax && value >= max ? `${max}+` : String(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className={WIZARD_SECTION_LABEL}>{withSectionColon(label)}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-900 dark:text-white',
            'hover:border-brand/50 disabled:opacity-40 disabled:hover:border-border',
          )}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-lg font-bold text-gray-900 dark:text-white">
          {display}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-900 dark:text-white',
            'hover:border-brand/50 disabled:opacity-40 disabled:hover:border-border',
          )}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

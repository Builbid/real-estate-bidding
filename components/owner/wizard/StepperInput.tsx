'use client';

import { Minus, Plus } from 'lucide-react';
import { FORM_OPTION_UNSELECTED } from '@/components/owner/wizard/formTheme';
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
    <div className="space-y-4">
      <label className={WIZARD_SECTION_LABEL}>{withSectionColon(label)}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl text-slate-900 dark:text-slate-100',
            FORM_OPTION_UNSELECTED,
            'hover:bg-slate-800/60 disabled:opacity-40',
          )}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-lg font-bold text-slate-900 dark:text-slate-100">
          {display}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl text-slate-900 dark:text-slate-100',
            FORM_OPTION_UNSELECTED,
            'hover:bg-slate-800/60 disabled:opacity-40',
          )}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { FieldError } from '@/components/owner/wizard/fieldValidation';
import {
  useWizardAccentLabel,
  WIZARD_SECTION_LABEL_BASE,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';
import { cn } from '@/lib/utils';

export const PLINTH_AREA_NOTE =
  '*Note: Plinth area means total covered construction area of a single floor.';

export function PlinthAreaFields({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const accent = useWizardAccentLabel();

  return (
    <div data-field-invalid={error ? 'true' : undefined}>
      <label
        className={cn(
          'mb-1.5',
          accent
            ? WIZARD_SECTION_LABEL_BASE
            : 'text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100',
        )}
      >
        {withSectionColon('Approximate Plinth Area (Sq. Ft.)')}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-base text-slate-900 shadow-sm md:text-sm',
          'dark:bg-slate-800/80 dark:text-slate-100 dark:[color-scheme:dark]',
          'placeholder:text-slate-500 focus:outline-none focus:ring-2',
          'dark:placeholder:text-slate-400',
          error
            ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:ring-red-500'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700 dark:focus:border-sky-400 dark:focus:ring-sky-400/20',
        )}
      />
      <p className="mt-0.5 text-left text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
        {PLINTH_AREA_NOTE}
      </p>
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

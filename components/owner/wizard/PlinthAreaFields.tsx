'use client';

import { Input } from '@/components/ui/input';
import {
  useWizardAccentLabel,
  WIZARD_SECTION_LABEL_BASE,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';
import { plinthAreaFromFeet } from '@/lib/drawingDesign';
import { cn } from '@/lib/utils';

export const PLINTH_AREA_NOTE =
  '*Note: Plinth area means total covered construction area of a single floor.';

function formatTotalPlinthArea(area: number): string {
  return `${area.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Sq. Ft.`;
}

export function PlinthAreaFields({
  lengthFt,
  widthFt,
  onLengthChange,
  onWidthChange,
  lengthError,
  widthError,
}: {
  lengthFt: string;
  widthFt: string;
  onLengthChange: (value: string) => void;
  onWidthChange: (value: string) => void;
  lengthError?: string;
  widthError?: string;
}) {
  const accent = useWizardAccentLabel();
  const area = plinthAreaFromFeet(lengthFt, widthFt);

  return (
    <div
      className="space-y-3"
      data-field-invalid={lengthError || widthError ? 'true' : undefined}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Length (in Feet)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder=""
          value={lengthFt}
          error={lengthError}
          onChange={(event) => onLengthChange(event.target.value)}
        />
        <Input
          label="Width / Breadth (in Feet)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder=""
          value={widthFt}
          error={widthError}
          onChange={(event) => onWidthChange(event.target.value)}
        />
      </div>

      <div>
        <label
          className={cn(
            'mb-1.5',
            accent
              ? WIZARD_SECTION_LABEL_BASE
              : 'text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100',
          )}
        >
          {withSectionColon('Total Approximate Plinth Area')}
        </label>
        <input
          type="text"
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          value={area == null ? '' : formatTotalPlinthArea(area)}
          className="flex h-11 w-full cursor-default rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-900 shadow-sm md:text-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
        />
        <p className="mt-0.5 text-left text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
          {PLINTH_AREA_NOTE}
        </p>
      </div>
    </div>
  );
}

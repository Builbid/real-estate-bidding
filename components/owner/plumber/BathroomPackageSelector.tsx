'use client';

import { CheckCircle2 } from 'lucide-react';
import { FORM_OPTION_SELECTED, FORM_OPTION_UNSELECTED } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';
import {
  BATHROOM_PACKAGE_OPTIONS,
  type BathroomPackage,
} from '@/lib/tradeWorkDetails';
import { WIZARD_SECTION_LABEL, withSectionColon } from '@/components/owner/wizard/StartTimeAndNotes';

export function BathroomPackageSelector({
  value,
  onChange,
}: {
  value: BathroomPackage | null;
  onChange: (value: BathroomPackage) => void;
}) {
  const selectedPackage = BATHROOM_PACKAGE_OPTIONS.find((pkg) => pkg.value === value) ?? null;

  return (
    <div className="space-y-4">
      <label className={WIZARD_SECTION_LABEL}>{withSectionColon('Type')}</label>
      <p className="text-xs font-medium text-slate-500 -mt-1">
        Choose Common, Master, or Luxury. Included fittings appear below.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {BATHROOM_PACKAGE_OPTIONS.map((pkg) => {
          const selected = value === pkg.value;
          return (
            <button
              key={pkg.value}
              type="button"
              onClick={() => onChange(pkg.value)}
              aria-pressed={selected}
              className={cn(
                'relative w-full rounded-xl px-2 py-3 sm:px-3 sm:py-4 text-center transition-all duration-200',
                selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
              )}
            >
              {selected && (
                <CheckCircle2
                  className="absolute top-2 right-2 h-4 w-4 text-blue-600"
                  aria-hidden
                />
              )}
              <p className={cn('text-sm', selected ? 'font-medium text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200')}>{pkg.shortLabel}</p>
            </button>
          );
        })}
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          selectedPackage ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {selectedPackage && (
            <ul className="mt-3 space-y-1.5 rounded-lg border border-slate-700/30 bg-slate-800/40 p-3">
              <li className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                {selectedPackage.label} — included work specifications
              </li>
              {selectedPackage.included.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs font-medium text-slate-300"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BATHROOM_PACKAGE_OPTIONS,
  type BathroomPackage,
} from '@/lib/tradeWorkDetails';
import { WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';

export function BathroomPackageSelector({
  value,
  onChange,
}: {
  value: BathroomPackage | null;
  onChange: (value: BathroomPackage) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={WIZARD_SECTION_LABEL}>Bathroom Package</label>
      <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 -mt-0.5 mb-1">
        Choose one package. Included fittings appear when a package is selected.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {BATHROOM_PACKAGE_OPTIONS.map((pkg) => {
          const selected = value === pkg.value;
          return (
            <button
              key={pkg.value}
              type="button"
              onClick={() => onChange(pkg.value)}
              aria-pressed={selected}
              className={cn(
                'relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
                selected
                  ? 'border-emerald-500/70 bg-emerald-500/10 shadow-md shadow-emerald-500/15'
                  : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
              )}
            >
              {selected && (
                <CheckCircle2
                  className="absolute top-3 right-3 h-5 w-5 text-emerald-500 dark:text-emerald-400"
                  aria-hidden
                />
              )}
              <p className="text-sm font-bold text-gray-900 dark:text-white pr-8">{pkg.label}</p>
              <p className="mt-1 text-xs font-medium text-gray-700 dark:text-zinc-300">
                {pkg.description}
              </p>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-in-out',
                  selected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <ul className="mt-3 space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <li className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Included work scope
                    </li>
                    {pkg.included.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-xs font-medium text-gray-800 dark:text-zinc-200"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

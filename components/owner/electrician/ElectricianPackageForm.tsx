'use client';

import { CheckCircle2, ChevronDown } from 'lucide-react';
import {
  ELECTRICIAN_SCOPE_PACKAGES,
  type ElectricianPackageKind,
  type ElectricianSubOptionId,
} from '@/lib/tradeWorkDetails';
import { cn } from '@/lib/utils';

export function ElectricianPackageForm({
  selectedPackages,
  selectedSubOptions,
  onChangePackages,
  onChangeSubOptions,
}: {
  selectedPackages: ElectricianPackageKind[];
  selectedSubOptions: ElectricianSubOptionId[];
  onChangePackages: (value: ElectricianPackageKind[]) => void;
  onChangeSubOptions: (value: ElectricianSubOptionId[]) => void;
}) {
  function togglePackage(id: ElectricianPackageKind) {
    const enabled = selectedPackages.includes(id);
    const catalog = ELECTRICIAN_SCOPE_PACKAGES.find((pkg) => pkg.id === id);
    const optionIds = catalog?.options.map((option) => option.id) ?? [];
    if (enabled) {
      onChangePackages(selectedPackages.filter((item) => item !== id));
      onChangeSubOptions(selectedSubOptions.filter((item) => !optionIds.includes(item)));
      return;
    }
    onChangePackages([...selectedPackages, id]);
  }

  function toggleSubOption(packageId: ElectricianPackageKind, optionId: ElectricianSubOptionId) {
    if (!selectedPackages.includes(packageId)) {
      onChangePackages([...selectedPackages, packageId]);
    }
    onChangeSubOptions(
      selectedSubOptions.includes(optionId)
        ? selectedSubOptions.filter((item) => item !== optionId)
        : [...selectedSubOptions, optionId],
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        Check a category to reveal its sub-options. Electricians bid a labour rate only for the items you select.
      </p>
      {ELECTRICIAN_SCOPE_PACKAGES.map((pkg) => {
        const open = selectedPackages.includes(pkg.id);
        const pickedCount = pkg.options.filter((option) => selectedSubOptions.includes(option.id)).length;
        return (
          <div
            key={pkg.id}
            className={cn(
              'rounded-xl border-2 overflow-hidden',
              open
                ? 'border-emerald-500/50 bg-secondary/10'
                : 'border-border bg-secondary/15',
            )}
          >
            <label className="flex w-full cursor-pointer items-start gap-3 p-4">
              <input
                type="checkbox"
                checked={open}
                onChange={() => togglePackage(pkg.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{pkg.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 flex-shrink-0 text-gray-500 transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </span>
                <span className="mt-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                  {open
                    ? pickedCount > 0
                      ? `${pickedCount} sub-option${pickedCount === 1 ? '' : 's'} selected`
                      : 'Select the items electricians should quote'
                    : 'Tap to add this category'}
                </span>
              </span>
            </label>
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-in-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-2 border-t border-border/70 px-4 pb-4 pt-3">
                  {pkg.options.map((option) => {
                    const checked = selectedSubOptions.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5',
                          checked
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-border/70 bg-background/40',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSubOption(pkg.id, option.id)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="flex-1">
                          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {option.label}
                            {checked && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                            )}
                          </span>
                          {option.note ? (
                            <span className="mt-0.5 block text-[11px] font-medium italic text-gray-600 dark:text-zinc-400">
                              ({option.note})
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
                              Labour rate {option.unitSuffix}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

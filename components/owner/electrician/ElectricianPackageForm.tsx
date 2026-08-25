'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ElectricianWorkCard } from '@/components/owner/electrician/ElectricianWorkCard';
import { ELECTRICIAN_WORK_IMAGES } from '@/lib/electricianWorkImages';
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
  const [expandedPackages, setExpandedPackages] = useState<ElectricianPackageKind[]>(() =>
    selectedPackages.length > 0 ? selectedPackages : [ELECTRICIAN_SCOPE_PACKAGES[0].id],
  );

  useEffect(() => {
    if (selectedPackages.length === 0) return;
    setExpandedPackages((current) => {
      const merged = new Set([...current, ...selectedPackages]);
      return ELECTRICIAN_SCOPE_PACKAGES.map((pkg) => pkg.id).filter((id) => merged.has(id));
    });
  }, [selectedPackages]);

  function toggleExpanded(id: ElectricianPackageKind) {
    setExpandedPackages((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSubOption(packageId: ElectricianPackageKind, optionId: ElectricianSubOptionId) {
    const isSelected = selectedSubOptions.includes(optionId);

    if (isSelected) {
      const nextSubOptions = selectedSubOptions.filter((item) => item !== optionId);
      onChangeSubOptions(nextSubOptions);
      const catalog = ELECTRICIAN_SCOPE_PACKAGES.find((pkg) => pkg.id === packageId);
      const stillHasPicks = catalog?.options.some((option) => nextSubOptions.includes(option.id));
      if (!stillHasPicks) {
        onChangePackages(selectedPackages.filter((item) => item !== packageId));
      }
      return;
    }

    if (!selectedPackages.includes(packageId)) {
      onChangePackages([...selectedPackages, packageId]);
    }
    onChangeSubOptions([...selectedSubOptions, optionId]);
    setExpandedPackages((current) => (current.includes(packageId) ? current : [...current, packageId]));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        Expand a category and tap the work cards you need. Electricians bid a labour rate only for
        the items you select.
      </p>
      {ELECTRICIAN_SCOPE_PACKAGES.map((pkg) => {
        const open = expandedPackages.includes(pkg.id);
        const pickedCount = pkg.options.filter((option) => selectedSubOptions.includes(option.id)).length;
        const hasSelections = pickedCount > 0;

        return (
          <div
            key={pkg.id}
            className={cn(
              'overflow-hidden rounded-xl border-2 transition-colors',
              hasSelections
                ? 'border-emerald-500/40 bg-secondary/10'
                : open
                  ? 'border-emerald-500/30 bg-secondary/10'
                  : 'border-border bg-secondary/15',
            )}
          >
            <button
              type="button"
              onClick={() => toggleExpanded(pkg.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/20"
            >
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{pkg.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200',
                      open && 'rotate-180',
                    )}
                  />
                </span>
                <span className="mt-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                  {hasSelections
                    ? `${pickedCount} item${pickedCount === 1 ? '' : 's'} selected`
                    : open
                      ? 'Select the work items electricians should quote'
                      : 'Tap to view available work items'}
                </span>
              </span>
            </button>

            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-in-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/70 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {pkg.options.map((option) => (
                      <ElectricianWorkCard
                        key={option.id}
                        selected={selectedSubOptions.includes(option.id)}
                        onClick={() => toggleSubOption(pkg.id, option.id)}
                        title={option.label}
                        subtitle={option.note ?? `Labour rate ${option.unitSuffix}`}
                        imageUrl={ELECTRICIAN_WORK_IMAGES[option.id]}
                        imageAlt={option.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

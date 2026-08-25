'use client';

import { ElectricianWorkCard } from '@/components/owner/electrician/ElectricianWorkCard';
import { ELECTRICIAN_WORK_IMAGES } from '@/lib/electricianWorkImages';
import {
  ELECTRICIAN_SCOPE_PACKAGES,
  type ElectricianPackageKind,
  type ElectricianSubOptionId,
} from '@/lib/tradeWorkDetails';

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
  }

  return (
    <div className="space-y-8">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        Tap the work items you need. Electricians bid a labour rate only for the items you select.
      </p>
      {ELECTRICIAN_SCOPE_PACKAGES.map((pkg) => {
        const pickedCount = pkg.options.filter((option) => selectedSubOptions.includes(option.id)).length;

        return (
          <section key={pkg.id} className="space-y-3">
            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">{pkg.label}</h3>
              {pickedCount > 0 ? (
                <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {pickedCount} selected
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
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
          </section>
        );
      })}
    </div>
  );
}

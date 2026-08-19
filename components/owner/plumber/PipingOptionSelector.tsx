'use client';

import { Info, Ruler } from 'lucide-react';
import { OptionSelectCard } from '@/components/owner/wizard/OptionSelectCard';
import { WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import {
  buildPlumbingBidOptions,
  countPlumbingBidOptions,
  MAX_PLUMBING_BID_OPTIONS,
  PLUMBING_TAPE_MEASURE_DISCLAIMER,
} from '@/lib/plumberBid';
import {
  CPVC_PIPE_SIZE_OPTIONS,
  DRAINAGE_INSTALL_METHOD_OPTIONS,
  WATER_INSTALL_METHOD_OPTIONS,
  type CpvcPipeSize,
  type DrainageInstallMethod,
  type WaterInstallMethod,
} from '@/lib/tradeWorkDetails';
import { cn } from '@/lib/utils';

function toggleUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function PipingOptionSelector({
  cpvcPipeSizes,
  waterInstallMethods,
  includeToiletWastePipe,
  drainageInstallMethods,
  onChangeSizes,
  onChangeWaterMethods,
  onChangeIncludeWaste,
  onChangeDrainageMethods,
}: {
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: boolean;
  drainageInstallMethods: DrainageInstallMethod[];
  onChangeSizes: (value: CpvcPipeSize[]) => void;
  onChangeWaterMethods: (value: WaterInstallMethod[]) => void;
  onChangeIncludeWaste: (value: boolean) => void;
  onChangeDrainageMethods: (value: DrainageInstallMethod[]) => void;
}) {
  const drainCount = includeToiletWastePipe ? drainageInstallMethods.length : 0;
  const optionCount = countPlumbingBidOptions({
    cpvcPipeSizes,
    waterInstallMethods,
    includeToiletWastePipe,
    drainageInstallMethods,
  });
  const bidOptions = buildPlumbingBidOptions({
    cpvcPipeSizes,
    waterInstallMethods,
    includeToiletWastePipe,
    drainageInstallMethods,
  });

  function canAddSize(size: CpvcPipeSize): boolean {
    if (cpvcPipeSizes.includes(size)) return true;
    return (
      (cpvcPipeSizes.length + 1) * Math.max(waterInstallMethods.length, 1) + drainCount <=
      MAX_PLUMBING_BID_OPTIONS
    );
  }

  function canAddWaterMethod(method: WaterInstallMethod): boolean {
    if (waterInstallMethods.includes(method)) return true;
    const sizeCount = Math.max(cpvcPipeSizes.length, 1);
    return sizeCount * (waterInstallMethods.length + 1) + drainCount <= MAX_PLUMBING_BID_OPTIONS;
  }

  function canEnableWaste(): boolean {
    if (includeToiletWastePipe) return true;
    return optionCount + 1 <= MAX_PLUMBING_BID_OPTIONS;
  }

  function canAddDrainageMethod(method: DrainageInstallMethod): boolean {
    if (drainageInstallMethods.includes(method)) return true;
    const waterCount = cpvcPipeSizes.length * waterInstallMethods.length;
    return waterCount + drainageInstallMethods.length + 1 <= MAX_PLUMBING_BID_OPTIONS;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <label className={WIZARD_SECTION_LABEL}>Water Supply Lines (CPVC)</label>
        <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 -mt-0.5">
          Select every pipe size plumbers should quote. Each size × installation method becomes a
          bidding option at ₹ / Running Foot.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CPVC_PIPE_SIZE_OPTIONS.map((opt) => {
            const selected = cpvcPipeSizes.includes(opt.value);
            const disabled = !canAddSize(opt.value);
            return (
              <OptionSelectCard
                key={opt.value}
                selected={selected}
                multi
                disabled={disabled && !selected}
                label={opt.label}
                onClick={() => {
                  if (disabled && !selected) return;
                  onChangeSizes(toggleUnique(cpvcPipeSizes, opt.value));
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={WIZARD_SECTION_LABEL}>Water Installation Method</label>
        <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 -mt-0.5">
          Select one or both methods so contractors can bid concealed (higher) and open (lower)
          rates.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WATER_INSTALL_METHOD_OPTIONS.map((opt) => {
            const selected = waterInstallMethods.includes(opt.value);
            const disabled = !canAddWaterMethod(opt.value);
            return (
              <OptionSelectCard
                key={opt.value}
                selected={selected}
                multi
                disabled={disabled && !selected}
                label={opt.label}
                description={opt.description}
                onClick={() => {
                  if (disabled && !selected) return;
                  onChangeWaterMethods(toggleUnique(waterInstallMethods, opt.value));
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={WIZARD_SECTION_LABEL}>Soil & Waste Drainage Lines (SWR/PVC)</label>
        <OptionSelectCard
          selected={includeToiletWastePipe}
          multi
          disabled={!canEnableWaste() && !includeToiletWastePipe}
          label="Include 4-inch Toilet Waste Pipe (SWR)"
          description="Adds a separate ₹ / Running Foot bid line for the toilet waste pipe."
          onClick={() => {
            if (!canEnableWaste() && !includeToiletWastePipe) return;
            const next = !includeToiletWastePipe;
            onChangeIncludeWaste(next);
            if (!next) onChangeDrainageMethods([]);
          }}
        />
        {includeToiletWastePipe && (
          <div className="mt-2">
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-zinc-400">
              Drainage installation method
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DRAINAGE_INSTALL_METHOD_OPTIONS.map((opt) => {
                const selected = drainageInstallMethods.includes(opt.value);
                const disabled = !canAddDrainageMethod(opt.value);
                return (
                  <OptionSelectCard
                    key={opt.value}
                    selected={selected}
                    multi
                    disabled={disabled && !selected}
                    label={opt.label}
                    description={opt.description}
                    onClick={() => {
                      if (disabled && !selected) return;
                      onChangeDrainageMethods(toggleUnique(drainageInstallMethods, opt.value));
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(WIZARD_SECTION_LABEL, 'normal-case tracking-normal')}>
            Bidding options ({optionCount}/{MAX_PLUMBING_BID_OPTIONS})
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Lowest average wins
          </span>
        </div>
        {bidOptions.length === 0 ? (
          <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
            Select pipe sizes and installation methods to generate Option A / B / C bid lines.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {bidOptions.map((option) => (
              <li
                key={option.id}
                className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs font-medium text-gray-800 dark:text-zinc-200"
              >
                <Ruler className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                <span>
                  {option.label}
                  <span className="ml-1 text-gray-500 dark:text-zinc-400">· ₹ / Running Foot</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
          Rank is based on the overall average rate across these options. Up to{' '}
          {MAX_PLUMBING_BID_OPTIONS} options can be opened for bidding.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
        <p className="text-xs font-medium leading-relaxed text-gray-800 dark:text-zinc-200">
          {PLUMBING_TAPE_MEASURE_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

'use client';

import { CheckCircle2, Info, Lock } from 'lucide-react';
import { BathroomPackageSelector } from '@/components/owner/plumber/BathroomPackageSelector';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import {
  BATHROOM_ROOM_SIZE_OPTIONS,
  CPVC_PIPE_SIZE_OPTIONS,
  DRAINAGE_INSTALL_METHOD_OPTIONS,
  PLUMBING_FLOOR_LEVEL_OPTIONS,
  TANK_DISTANCE_OPTIONS,
  WATER_INSTALL_METHOD_OPTIONS,
  resolvePlumbingSmartDefaults,
  type BathroomPackage,
  type BathroomRoomSize,
  type PlumbingFloorLevel,
  type TankDistance,
  type WaterInstallMethod,
} from '@/lib/tradeWorkDetails';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Bathroom', 'Property', 'Distance'] as const;

export function PlumbingProgressiveForm({
  bathroomPackage,
  bathroomSize,
  plumbingFloorLevel,
  fittingType,
  tankDistance,
  onChangePackage,
  onChangeSize,
  onChangeFloor,
  onChangeFitting,
  onChangeDistance,
}: {
  bathroomPackage: BathroomPackage | null;
  bathroomSize: BathroomRoomSize | null;
  plumbingFloorLevel: PlumbingFloorLevel;
  fittingType: WaterInstallMethod;
  tankDistance: TankDistance | null;
  onChangePackage: (value: BathroomPackage) => void;
  onChangeSize: (value: BathroomRoomSize) => void;
  onChangeFloor: (value: PlumbingFloorLevel) => void;
  onChangeFitting: (value: WaterInstallMethod) => void;
  onChangeDistance: (value: TankDistance) => void;
}) {
  const step1Done = Boolean(bathroomPackage && bathroomSize);
  const step2Done = step1Done;
  const activeStep = !step1Done ? 1 : tankDistance ? 3 : 2;
  const smart = resolvePlumbingSmartDefaults(fittingType, plumbingFloorLevel);
  const fittingLabel =
    WATER_INSTALL_METHOD_OPTIONS.find((o) => o.value === fittingType)?.label ?? fittingType;
  const drainageLabel =
    DRAINAGE_INSTALL_METHOD_OPTIONS.find((o) => o.value === smart.drainageInstallMethods[0])
      ?.label ?? smart.drainageInstallMethods[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const complete = step === 1 ? step1Done : step === 2 ? step2Done : Boolean(tankDistance);
          const current = activeStep === step;
          return (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                  complete
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-secondary text-muted-foreground/80',
                )}
              >
                {complete ? '✓' : step}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs truncate',
                  current
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-600 dark:text-zinc-400',
                )}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className="h-px flex-1 bg-secondary mx-1 min-w-[8px]" />
              )}
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-border/80 bg-secondary/15 p-4 space-y-4">
        <StepHeading step={1} title="Bathroom Package & Size" />
        <BathroomPackageSelector value={bathroomPackage} onChange={onChangePackage} />
        <div className="flex flex-col gap-1.5">
          <label className={WIZARD_SECTION_LABEL}>Size</label>
          <OptionSelectGrid
            options={BATHROOM_ROOM_SIZE_OPTIONS}
            value={bathroomSize}
            onSelect={onChangeSize}
          />
        </div>
      </section>

      <section
        className={cn(
          'rounded-xl border p-4 space-y-4 transition-opacity',
          step1Done
            ? 'border-border/80 bg-secondary/15'
            : 'border-border/50 bg-secondary/10 opacity-60 pointer-events-none',
        )}
        aria-disabled={!step1Done}
      >
        <StepHeading step={2} title="Property & Installation Type" locked={!step1Done} />
        <div className="flex flex-col gap-1.5">
          <label className={WIZARD_SECTION_LABEL}>Floor</label>
          <OptionSelectGrid
            options={PLUMBING_FLOOR_LEVEL_OPTIONS}
            value={plumbingFloorLevel}
            onSelect={onChangeFloor}
            columns={3}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={WIZARD_SECTION_LABEL}>Fitting Type</label>
          <OptionSelectGrid
            options={WATER_INSTALL_METHOD_OPTIONS}
            value={fittingType}
            onSelect={onChangeFitting}
            columns={2}
          />
        </div>
      </section>

      <section
        className={cn(
          'rounded-xl border p-4 space-y-4 transition-opacity',
          step1Done
            ? 'border-border/80 bg-secondary/15'
            : 'border-border/50 bg-secondary/10 opacity-60 pointer-events-none',
        )}
        aria-disabled={!step1Done}
      >
        <StepHeading step={3} title="Distance & Smart Piping Defaults" locked={!step1Done} />
        <div className="flex flex-col gap-1.5">
          <label className={WIZARD_SECTION_LABEL}>Approximate Distance to Tank</label>
          <OptionSelectGrid
            options={TANK_DISTANCE_OPTIONS}
            value={tankDistance}
            onSelect={onChangeDistance}
            columns={3}
          />
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className={cn(WIZARD_SECTION_LABEL, 'normal-case tracking-normal')}>
              Smart piping defaults (pre-selected)
            </p>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
            Standard supply and waste lines are included automatically so you do not need to pick
            pipe diameters.
          </p>
          <ul className="space-y-1.5">
            {smart.cpvcPipeSizes.map((size) => (
              <li
                key={size}
                className="flex items-start gap-2 text-xs font-medium text-gray-800 dark:text-zinc-200"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                <span>
                  CPVC {CPVC_PIPE_SIZE_OPTIONS.find((o) => o.value === size)?.label} supply —{' '}
                  {fittingLabel}
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-xs font-medium text-gray-800 dark:text-zinc-200">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              <span>4-inch SWR toilet waste pipe — {drainageLabel}</span>
            </li>
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs font-medium leading-relaxed text-gray-800 dark:text-zinc-200">
            Final settlement will be based on actual site measurement at agreed unit rates.
          </p>
        </div>
      </section>
    </div>
  );
}

function StepHeading({
  step,
  title,
  locked,
}: {
  step: number;
  title: string;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        Step {step}: {title}
      </h3>
      {locked ? (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
          Complete step 1 first
        </span>
      ) : null}
    </div>
  );
}

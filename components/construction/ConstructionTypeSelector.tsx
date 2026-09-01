'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Check, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CONSTRUCTION_TYPE_FULL,
  getAvailableLabourConstructionOptions,
  getConstructionDisplayEmoji,
  getConstructionDisplayShortLabel,
  getConstructionTooltipSteps,
  getFinishingBlockReason,
  getFloorBadge,
  getFloorDisplayName,
  getFloorHint,
  getFloorSelectedAccent,
  getFloorStripGradient,
  getSkeletonOptionValue,
  getSkeletonSubLabel,
  isSkeletonConstructionType,
  pruneInvalidConstructionTypes,
  sortBuildingTypes,
  type BuildingType,
  type ConstructionTypeValue,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import { cn } from '@/lib/utils';

interface ConstructionTypeSelectorProps {
  buildingTypes: BuildingType[];
  value: ConstructionTypesMap;
  onChange: (value: ConstructionTypesMap) => void;
  showValidation?: boolean;
  /** Construction firms bid a turnkey rate, so their "Full Finishing" scope tooltip is more complete. */
  serviceType?: 'labour_contractor' | 'construction_firm';
}

export function ConstructionTypeSelector({
  buildingTypes,
  value,
  onChange,
  showValidation = false,
  serviceType = 'labour_contractor',
}: ConstructionTypeSelectorProps) {
  const ordered = sortBuildingTypes(buildingTypes);
  const blockRefs = useRef<Partial<Record<BuildingType, HTMLDivElement | null>>>({});

  const firstMissing = ordered.find((t) => !value[t]);

  useEffect(() => {
    if (!showValidation || !firstMissing) return;
    const el = blockRefs.current[firstMissing];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [showValidation, firstMissing]);

  function selectType(buildingType: BuildingType, constructionType: ConstructionTypeValue) {
    const draft = { ...value, [buildingType]: constructionType };
    const { next } = pruneInvalidConstructionTypes(buildingTypes, draft);
    onChange(next);
  }

  // Firm path keeps the legacy two-card Skeleton / Full UI (firm wizard usually skips this step).
  if (serviceType === 'construction_firm') {
    return (
      <FirmLegacySelector
        buildingTypes={buildingTypes}
        value={value}
        onChange={onChange}
        showValidation={showValidation}
        serviceType={serviceType}
      />
    );
  }

  return (
    <div className="space-y-4">
      {ordered.map((buildingType) => {
        const selected = value[buildingType];
        const accent = getFloorSelectedAccent(buildingType);
        const hasError = showValidation && !selected;
        const options = getAvailableLabourConstructionOptions(
          buildingType,
          buildingTypes,
          value,
        );
        const blockReason = getFinishingBlockReason(buildingType, buildingTypes, value);

        return (
          <LabourFloorBlock
            key={buildingType}
            ref={(el) => {
              blockRefs.current[buildingType] = el;
            }}
            buildingType={buildingType}
            allBuildingTypes={buildingTypes}
            selected={selected}
            accent={accent}
            hasError={hasError}
            options={options}
            blockReason={blockReason}
            onSelect={selectType}
            serviceType={serviceType}
          />
        );
      })}

      <SelectionSummary buildingTypes={buildingTypes} value={value} />
    </div>
  );
}

type LabourOption = ReturnType<typeof getAvailableLabourConstructionOptions>[number];

interface LabourFloorBlockProps {
  buildingType: BuildingType;
  allBuildingTypes: BuildingType[];
  selected?: ConstructionTypeValue;
  accent: 'green' | 'purple';
  hasError: boolean;
  options: LabourOption[];
  blockReason: string | null;
  onSelect: (buildingType: BuildingType, constructionType: ConstructionTypeValue) => void;
  serviceType: 'labour_contractor' | 'construction_firm';
}

const LabourFloorBlock = forwardRef<HTMLDivElement, LabourFloorBlockProps>(
  function LabourFloorBlock(
    {
      buildingType,
      allBuildingTypes,
      selected,
      accent,
      hasError,
      options,
      blockReason,
      onSelect,
      serviceType,
    },
    ref,
  ) {
    const [infoValue, setInfoValue] = useState<ConstructionTypeValue | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);

    const displayName = getFloorDisplayName(buildingType);
    const hint = getFloorHint(buildingType, allBuildingTypes);
    const gradient = getFloorStripGradient(buildingType);
    const tooltipKind = infoValue ?? selected ?? CONSTRUCTION_TYPE_FULL;
    const tooltipSteps = getConstructionTooltipSteps(
      buildingType,
      isSkeletonConstructionType(tooltipKind) ? 'skeleton' : tooltipKind,
      serviceType,
    );

    const greenSelected =
      'border-2 border-[#22c55e] bg-[#1c2f1a] shadow-[0_0_16px_rgba(34,197,94,0.12)]';
    const purpleSelected =
      'border-2 border-[#818cf8] bg-[#1a1f3a] shadow-[0_0_16px_rgba(129,140,248,0.12)]';
    const selectedShell = accent === 'green' ? greenSelected : purpleSelected;

    const greenLabel = 'text-[#86efac]';
    const purpleLabel = 'text-[#a5b4fc]';
    const selectedLabel = accent === 'green' ? greenLabel : purpleLabel;

    const greenSub = 'text-[#4ade80]/80';
    const purpleSub = 'text-[#a5b4fc]/70';
    const selectedSub = accent === 'green' ? greenSub : purpleSub;

    const checkBg = accent === 'green' ? 'bg-[#22c55e]' : 'bg-[#818cf8]';

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl overflow-hidden border transition-all',
          'border-border/60 dark:border-border/40',
          hasError && 'border-red-500 ring-2 ring-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
        )}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 min-h-[56px]"
          style={{ background: gradient }}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-black/25 text-sm font-bold text-white">
            {getFloorBadge(buildingType)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
            <p className="text-[11px] text-white/70 leading-snug mt-0.5">{hint}</p>
          </div>
          <span
            className={cn(
              'flex-shrink-0 text-[10px]',
              selected
                ? 'rounded-full px-2.5 py-1 font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'font-medium text-white/45',
            )}
          >
            {selected ? '✓ Selected' : 'Choose →'}
          </span>
        </div>

        <div className="bg-[#f1f5f9] dark:bg-[#0e1520] p-3.5">
          {hasError && (
            <p className="text-xs text-red-500 dark:text-red-400 mb-2.5 font-medium">
              Please choose a construction type for this floor
            </p>
          )}

          <div className="space-y-2" role="radiogroup" aria-label={`${displayName} construction scope`}>
            {options.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <RadioOption
                  key={opt.value}
                  title={opt.title}
                  description={opt.description}
                  isSelected={isSelected}
                  disabled={opt.disabled}
                  selectedShell={selectedShell}
                  selectedLabel={selectedLabel}
                  selectedSub={selectedSub}
                  checkBg={checkBg}
                  onHover={() => setInfoValue(opt.value)}
                  onClick={() => {
                    if (opt.disabled) return;
                    onSelect(buildingType, opt.value);
                  }}
                />
              );
            })}
          </div>

          {blockReason && (
            <p className="mt-2.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300/90">
              Brick, plaster and flooring are unavailable: {blockReason}
            </p>
          )}

          <div className="flex justify-end mt-2.5">
            <Popover open={infoOpen} onOpenChange={setInfoOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setInfoOpen(true)}
                  onMouseLeave={() => setInfoOpen(false)}
                >
                  <Info className="h-3 w-3" />
                  What&apos;s included?
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="text-xs max-w-[280px]"
                onMouseEnter={() => setInfoOpen(true)}
                onMouseLeave={() => setInfoOpen(false)}
              >
                <p className="font-semibold text-foreground mb-2">
                  {getConstructionDisplayShortLabel(tooltipKind)}
                </p>
                <ul className="space-y-1">
                  {tooltipSteps.map((step) => (
                    <li
                      key={step.label}
                      className={cn(step.included ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      {step.included ? '✅' : '❌'} {step.label}
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );
  },
);

interface RadioOptionProps {
  title: string;
  description: string;
  isSelected: boolean;
  disabled: boolean;
  selectedShell: string;
  selectedLabel: string;
  selectedSub: string;
  checkBg: string;
  onHover: () => void;
  onClick: () => void;
}

function RadioOption({
  title,
  description,
  isSelected,
  disabled,
  selectedShell,
  selectedLabel,
  selectedSub,
  checkBg,
  onHover,
  onClick,
}: RadioOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
      disabled={disabled}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      className={cn(
        'relative w-full min-h-[44px] rounded-xl p-3 text-left transition-all',
        disabled
          ? 'cursor-not-allowed opacity-45 border-[1.5px] border-[#e2e8f0] dark:border-gray-700 bg-gray-100/80 dark:bg-gray-900/40'
          : isSelected
            ? cn(selectedShell, 'active:scale-[0.99]')
            : cn(
                'border-[1.5px] border-[#e2e8f0] dark:border-gray-600',
                'bg-white dark:bg-gray-800/40',
                'hover:bg-gray-50 dark:hover:bg-gray-800/70',
                'active:scale-[0.99]',
              ),
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2',
            isSelected && !disabled
              ? cn(checkBg, 'border-transparent')
              : 'border-muted-foreground/40 bg-transparent',
          )}
        >
          {isSelected && !disabled && (
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-xs font-bold leading-tight',
              disabled
                ? 'text-muted-foreground'
                : isSelected
                  ? selectedLabel
                  : 'text-foreground dark:text-gray-200',
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              'block text-[10px] leading-snug mt-0.5',
              disabled
                ? 'text-muted-foreground'
                : isSelected
                  ? selectedSub
                  : 'text-muted-foreground',
            )}
          >
            {description}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Legacy two-card UI for construction firm (step usually skipped). */
function FirmLegacySelector({
  buildingTypes,
  value,
  onChange,
  showValidation,
  serviceType,
}: ConstructionTypeSelectorProps & {
  serviceType: 'labour_contractor' | 'construction_firm';
}) {
  const ordered = sortBuildingTypes(buildingTypes);
  const blockRefs = useRef<Partial<Record<BuildingType, HTMLDivElement | null>>>({});
  const firstMissing = ordered.find((t) => !value[t]);

  useEffect(() => {
    if (!showValidation || !firstMissing) return;
    blockRefs.current[firstMissing]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [showValidation, firstMissing]);

  function selectType(buildingType: BuildingType, constructionType: ConstructionTypeValue) {
    onChange({ ...value, [buildingType]: constructionType });
  }

  return (
    <div className="space-y-4">
      {ordered.map((buildingType) => {
        const selected = value[buildingType];
        const skeletonValue = getSkeletonOptionValue(buildingType);
        const accent = getFloorSelectedAccent(buildingType);
        const hasError = showValidation && !selected;

        return (
          <FirmFloorBlock
            key={buildingType}
            ref={(el) => {
              blockRefs.current[buildingType] = el;
            }}
            buildingType={buildingType}
            allBuildingTypes={buildingTypes}
            selected={selected}
            skeletonValue={skeletonValue}
            accent={accent}
            hasError={!!hasError}
            onSelect={selectType}
            serviceType={serviceType}
          />
        );
      })}
      <SelectionSummary buildingTypes={buildingTypes} value={value} />
    </div>
  );
}

interface FirmFloorBlockProps {
  buildingType: BuildingType;
  allBuildingTypes: BuildingType[];
  selected?: ConstructionTypeValue;
  skeletonValue: ConstructionTypeValue;
  accent: 'green' | 'purple';
  hasError: boolean;
  onSelect: (buildingType: BuildingType, constructionType: ConstructionTypeValue) => void;
  serviceType: 'labour_contractor' | 'construction_firm';
}

const FirmFloorBlock = forwardRef<HTMLDivElement, FirmFloorBlockProps>(function FirmFloorBlock(
  {
    buildingType,
    allBuildingTypes,
    selected,
    skeletonValue,
    accent,
    hasError,
    onSelect,
    serviceType,
  },
  ref,
) {
  const [infoContext, setInfoContext] = useState<'skeleton' | 'full'>('skeleton');
  const [infoOpen, setInfoOpen] = useState(false);

  const displayName = getFloorDisplayName(buildingType);
  const hint = getFloorHint(buildingType, allBuildingTypes);
  const gradient = getFloorStripGradient(buildingType);
  const tooltipSteps = getConstructionTooltipSteps(buildingType, infoContext, serviceType);

  const greenSelected =
    'border-2 border-[#22c55e] bg-[#1c2f1a] shadow-[0_0_16px_rgba(34,197,94,0.12)]';
  const purpleSelected =
    'border-2 border-[#818cf8] bg-[#1a1f3a] shadow-[0_0_16px_rgba(129,140,248,0.12)]';
  const selectedShell = accent === 'green' ? greenSelected : purpleSelected;
  const selectedLabel = accent === 'green' ? 'text-[#86efac]' : 'text-[#a5b4fc]';
  const selectedSub = accent === 'green' ? 'text-[#4ade80]/80' : 'text-[#a5b4fc]/70';
  const checkBg = accent === 'green' ? 'bg-[#22c55e]' : 'bg-[#818cf8]';

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl overflow-hidden border transition-all',
        'border-border/60 dark:border-border/40',
        hasError && 'border-red-500 ring-2 ring-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      )}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 min-h-[56px]"
        style={{ background: gradient }}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-black/25 text-sm font-bold text-white">
          {getFloorBadge(buildingType)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
          <p className="text-[11px] text-white/70 leading-snug mt-0.5">{hint}</p>
        </div>
      </div>

      <div className="bg-[#f1f5f9] dark:bg-[#0e1520] p-3.5">
        <div className="flex gap-3">
          <button
            type="button"
            onMouseEnter={() => setInfoContext('skeleton')}
            onClick={() => onSelect(buildingType, skeletonValue)}
            className={cn(
              'relative flex-1 min-h-[44px] rounded-xl p-3 text-left transition-all active:scale-[0.98]',
              selected === skeletonValue
                ? selectedShell
                : 'border-[1.5px] border-[#e2e8f0] dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40',
            )}
          >
            {selected === skeletonValue && (
              <span
                className={cn(
                  'absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full',
                  checkBg,
                )}
              >
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </span>
            )}
            <span className="text-base leading-none block mb-1">🏗</span>
            <span
              className={cn(
                'block text-xs font-bold',
                selected === skeletonValue ? selectedLabel : 'text-foreground',
              )}
            >
              Skeleton Only
            </span>
            <span
              className={cn(
                'block text-[10px] mt-0.5',
                selected === skeletonValue ? selectedSub : 'text-muted-foreground',
              )}
            >
              {getSkeletonSubLabel(buildingType)}
            </span>
          </button>
          <button
            type="button"
            onMouseEnter={() => setInfoContext('full')}
            onClick={() => onSelect(buildingType, CONSTRUCTION_TYPE_FULL)}
            className={cn(
              'relative flex-1 min-h-[44px] rounded-xl p-3 text-left transition-all active:scale-[0.98]',
              selected === CONSTRUCTION_TYPE_FULL
                ? selectedShell
                : 'border-[1.5px] border-[#e2e8f0] dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40',
            )}
          >
            {selected === CONSTRUCTION_TYPE_FULL && (
              <span
                className={cn(
                  'absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full',
                  checkBg,
                )}
              >
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </span>
            )}
            <span className="text-base leading-none block mb-1">🏡</span>
            <span
              className={cn(
                'block text-xs font-bold',
                selected === CONSTRUCTION_TYPE_FULL ? selectedLabel : 'text-foreground',
              )}
            >
              Full Finishing
            </span>
            <span
              className={cn(
                'block text-[10px] mt-0.5',
                selected === CONSTRUCTION_TYPE_FULL ? selectedSub : 'text-muted-foreground',
              )}
            >
              Walls + Plaster included
            </span>
          </button>
        </div>

        <div className="flex justify-end mt-2.5">
          <Popover open={infoOpen} onOpenChange={setInfoOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onMouseEnter={() => setInfoOpen(true)}
                onMouseLeave={() => setInfoOpen(false)}
              >
                <Info className="h-3 w-3" />
                What&apos;s included?
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="text-xs max-w-[260px]"
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
            >
              <p className="font-semibold text-foreground mb-2">
                {infoContext === 'skeleton' ? 'Skeleton Only' : 'Full Finishing'}
              </p>
              <ul className="space-y-1">
                {tooltipSteps.map((step) => (
                  <li
                    key={step.label}
                    className={cn(step.included ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    {step.included ? '✅' : '❌'} {step.label}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
});

function SelectionSummary({
  buildingTypes,
  value,
}: {
  buildingTypes: BuildingType[];
  value: ConstructionTypesMap;
}) {
  const ordered = sortBuildingTypes(buildingTypes);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-[#f0fdf4] dark:bg-[#0d1a12] p-4">
      <p className="text-sm font-bold text-foreground mb-3">📋 Your Selection Summary</p>
      <ul className="space-y-2">
        {ordered.map((type) => {
          const selected = value[type];
          const name = getFloorDisplayName(type);
          return (
            <li
              key={type}
              className={cn(
                'flex items-center gap-2 text-sm',
                selected ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full flex-shrink-0',
                  selected ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                )}
              />
              <span className="font-medium min-w-[100px]">{name}</span>
              {selected ? (
                <span className="text-xs">
                  {getConstructionDisplayEmoji(selected)}{' '}
                  {getConstructionDisplayShortLabel(selected)}
                </span>
              ) : (
                <span className="text-xs italic">— not selected yet</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

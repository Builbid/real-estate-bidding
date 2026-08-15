'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import {
  ASSAM_BUILDING_TYPE,
  BUILDING_TYPE_OPTIONS,
  RCC_BUILDING_TYPES,
  type BuildingType,
} from '@/lib/buildingConfig';
import { Input } from '@/components/ui/input';
import {
  canToggleMistriFloorUpper,
  collectMistriFloorUpperLevels,
  mistriFloorUpperCount,
  parseCustomFloorSequence,
} from '@/lib/mistriDetails';
import { cn } from '@/lib/utils';

const RCC_4TH_FLOOR: BuildingType = 'RCC 4th Floor';

interface BuildingTypeSelectorProps {
  value: BuildingType[];
  onChange: (value: BuildingType[]) => void;
  error?: string | null;
  /** Defaults to construction copy; use "drawing" for Drawing & Design projects. */
  purpose?: 'construction' | 'drawing' | 'mistri';
  showCustomFloor?: boolean;
  customSelected?: boolean;
  customFloorNumber?: string;
  onCustomChange?: (selected: boolean, number: string) => void;
  customError?: string | null;
  /**
   * Mistri major activities: RCC floors must stay consecutive (no skipped storeys).
   * Upper-only runs like 3rd + 4th remain allowed.
   */
  enforceContiguousFloors?: boolean;
}

export function BuildingTypeSelector({
  value,
  onChange,
  error,
  purpose = 'construction',
  showCustomFloor = false,
  customSelected = false,
  customFloorNumber = '',
  onCustomChange,
  customError,
  enforceContiguousFloors = false,
}: BuildingTypeSelectorProps) {
  const hasAssam = value.includes(ASSAM_BUILDING_TYPE);
  const customFloorVisible = showCustomFloor && !hasAssam;
  const rccFloorsSelected = value.filter((t) => RCC_BUILDING_TYPES.includes(t));
  const has4thFloor = value.includes(RCC_4TH_FLOOR);
  /** Active with no RCC floors yet (custom alone) or together with 4th floor. */
  const customSelectable = rccFloorsSelected.length === 0 || has4thFloor;
  const hasRcc =
    rccFloorsSelected.length > 0 || (customSelected && customFloorVisible);

  const currentLevels = enforceContiguousFloors
    ? collectMistriFloorUpperLevels({
        buildingTypes: value,
        customSelected: customSelected && customFloorVisible && customSelectable,
        customFloorNumber,
      })
    : [];

  useEffect(() => {
    if (customSelected && !customSelectable) {
      onCustomChange?.(false, '');
    }
    // Intentionally omit onCustomChange — parent handlers are often inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSelected, customSelectable]);

  function isContiguousBlocked(nextLevel: number): boolean {
    if (!enforceContiguousFloors || hasAssam) return false;
    return !canToggleMistriFloorUpper(currentLevels, nextLevel);
  }

  function toggle(type: BuildingType) {
    if (type === ASSAM_BUILDING_TYPE) {
      if (value.includes(ASSAM_BUILDING_TYPE)) {
        onChange([]);
      } else {
        onChange([ASSAM_BUILDING_TYPE]);
        onCustomChange?.(false, '');
      }
      return;
    }

    const next = value.filter((t) => t !== ASSAM_BUILDING_TYPE);
    const isSelected = next.includes(type);

    if (enforceContiguousFloors) {
      const level = mistriFloorUpperCount(type);
      if (!canToggleMistriFloorUpper(currentLevels, level)) return;
    }

    if (isSelected) {
      const nextTypes = next.filter((t) => t !== type);
      if (
        customSelected &&
        nextTypes.length > 0 &&
        !nextTypes.includes(RCC_4TH_FLOOR)
      ) {
        onCustomChange?.(false, '');
      }
      onChange(nextTypes);
    } else {
      const nextTypes = [...next, type];
      if (customSelected && !nextTypes.includes(RCC_4TH_FLOOR)) {
        onCustomChange?.(false, '');
      }
      onChange(nextTypes);
    }
  }

  function toggleCustom() {
    if (!customFloorVisible) return;
    if (customSelected) {
      onCustomChange?.(false, customFloorNumber);
      return;
    }
    if (!customSelectable) return;

    const sequence = parseCustomFloorSequence(customFloorNumber, {
      requireStartAt5: has4thFloor,
    });
    if (enforceContiguousFloors && sequence) {
      const withoutCustom = collectMistriFloorUpperLevels({
        buildingTypes: value,
        customSelected: false,
      });
      const combined = [...new Set([...withoutCustom, ...sequence])].sort((a, b) => a - b);
      for (let i = 1; i < combined.length; i++) {
        if (combined[i] !== combined[i - 1] + 1) return;
      }
    }
    onChange(value.filter((t) => t !== ASSAM_BUILDING_TYPE));
    onCustomChange?.(true, customFloorNumber);
  }

  function onCustomSequenceChange(raw: string) {
    if (!customSelectable) return;
    const cleaned = raw.replace(/[^\d,\s]/g, '');
    if (!enforceContiguousFloors || !customSelected) {
      onCustomChange?.(true, cleaned);
      return;
    }
    const sequence = parseCustomFloorSequence(cleaned, {
      requireStartAt5: has4thFloor,
    });
    if (sequence == null) {
      onCustomChange?.(true, cleaned);
      return;
    }
    const withoutCustom = collectMistriFloorUpperLevels({
      buildingTypes: value,
      customSelected: false,
    });
    const combined = [...new Set([...withoutCustom, ...sequence])].sort((a, b) => a - b);
    for (let i = 1; i < combined.length; i++) {
      if (combined[i] !== combined[i - 1] + 1) return;
    }
    onCustomChange?.(true, cleaned);
  }

  const customDisabled = hasAssam || !customSelectable;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {purpose === 'drawing' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Select Assam Type <span className="font-semibold">or</span> RCC floor(s) for these drawings.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Assam Type and RCC cannot be mixed.
              <br />
              For RCC you can select multiple floors (e.g. Ground + 1st Floor).
            </p>
          </>
        ) : purpose === 'mistri' ? (
          <p className="text-sm text-muted-foreground">
            Select Assam Type <span className="font-semibold">or</span> RCC floor(s) for this project.
            Assam Type and RCC cannot be mixed.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Select the floor(s) you want to construct. You can select multiple floors.
            </p>
            <p className="text-xs text-muted-foreground/80">
              e.g. Building G+1? Select Ground Floor + 1st Floor
              <br />
              e.g. Already built Ground Floor? Select only 1st Floor
            </p>
          </>
        )}
      </div>

      {hasAssam && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Assam Type cannot be combined with RCC floors
        </p>
      )}
      {hasRcc && !hasAssam && (
        <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          Deselect all RCC floors to choose Assam Type
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BUILDING_TYPE_OPTIONS.map((type) => {
          const selected = value.includes(type);
          const isAssamOption = type === ASSAM_BUILDING_TYPE;
          const contiguousBlocked =
            !isAssamOption && !selected && isContiguousBlocked(mistriFloorUpperCount(type));
          const deselectBlocked =
            !isAssamOption &&
            selected &&
            enforceContiguousFloors &&
            !canToggleMistriFloorUpper(currentLevels, mistriFloorUpperCount(type));
          const disabled =
            (isAssamOption ? hasRcc : hasAssam) || contiguousBlocked || deselectBlocked;

          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => toggle(type)}
              title={
                contiguousBlocked
                  ? 'Select the floors in between first so the sequence stays consecutive'
                  : deselectBlocked
                    ? 'Deselect the highest or lowest floor first to keep a consecutive run'
                    : undefined
              }
              className={cn(
                'flex items-center gap-3 w-full text-left rounded-xl border-2 px-4 py-3 transition-all',
                disabled && 'opacity-45 cursor-not-allowed grayscale',
                selected
                  ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                  : 'border-border bg-card/80 hover:border-emerald-500/30 hover:bg-accent/40',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
                  selected
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-muted-foreground/40 bg-background',
                )}
              >
                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="text-sm font-medium text-foreground">{type}</span>
            </button>
          );
        })}

        {customFloorVisible && (
          <button
            type="button"
            disabled={customDisabled}
            onClick={toggleCustom}
            title={
              !customSelectable
                ? 'Select RCC 4th Floor first, or clear other floors to choose floors above 4th alone'
                : undefined
            }
            className={cn(
              'flex items-center gap-3 w-full text-left rounded-xl border-2 px-4 py-3 transition-all',
              customDisabled && 'opacity-45 cursor-not-allowed grayscale',
              customSelected && customSelectable
                ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                : 'border-border bg-card/80 hover:border-emerald-500/30 hover:bg-accent/40',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
                customSelected && customSelectable
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-muted-foreground/40 bg-background',
              )}
            >
              {customSelected && customSelectable && (
                <Check className="h-3 w-3" strokeWidth={3} />
              )}
            </span>
            <span className="text-sm font-medium text-foreground">
              Floors above 4th (custom)
            </span>
          </button>
        )}
      </div>

      {customFloorVisible && customSelected && customSelectable && (
        <div className="space-y-1.5">
          <Input
            label="Custom floor numbers (above 4th)"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 5,6,7"
            value={customFloorNumber}
            onChange={(e) => onCustomSequenceChange(e.target.value)}
            error={customError ?? undefined}
          />
          <p className="text-[11px] font-medium text-muted-foreground leading-snug">
            {has4thFloor
              ? 'With 4th floor selected, enter consecutive floors starting at 5 (example: 5,6,7).'
              : 'Enter consecutive floors from 5–50 (example: 7,8,9). Gaps or out-of-order values are invalid.'}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

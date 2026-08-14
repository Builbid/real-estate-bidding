'use client';

import { Check } from 'lucide-react';
import {
  ASSAM_BUILDING_TYPE,
  BUILDING_TYPE_OPTIONS,
  RCC_BUILDING_TYPES,
  type BuildingType,
} from '@/lib/buildingConfig';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
}: BuildingTypeSelectorProps) {
  const hasAssam = value.includes(ASSAM_BUILDING_TYPE);
  const hasRcc =
    value.some((t) => RCC_BUILDING_TYPES.includes(t)) || customSelected;

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
    if (next.includes(type)) {
      onChange(next.filter((t) => t !== type));
    } else {
      onChange([...next, type]);
    }
  }

  function toggleCustom() {
    if (customSelected) {
      onCustomChange?.(false, customFloorNumber);
      return;
    }
    onChange(value.filter((t) => t !== ASSAM_BUILDING_TYPE));
    onCustomChange?.(true, customFloorNumber);
  }

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
          <>
            <p className="text-sm text-muted-foreground">
              Select Assam Type <span className="font-semibold">or</span> RCC floor(s) for this project.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Assam Type and RCC cannot be mixed. For RCC you can select multiple floors.
            </p>
          </>
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
          const disabled = isAssamOption ? hasRcc : hasAssam;

          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => toggle(type)}
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

        {showCustomFloor && (
          <button
            type="button"
            disabled={hasAssam}
            onClick={toggleCustom}
            className={cn(
              'flex items-center gap-3 w-full text-left rounded-xl border-2 px-4 py-3 transition-all',
              hasAssam && 'opacity-45 cursor-not-allowed grayscale',
              customSelected
                ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                : 'border-border bg-card/80 hover:border-emerald-500/30 hover:bg-accent/40',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
                customSelected
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-muted-foreground/40 bg-background',
              )}
            >
              {customSelected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="text-sm font-medium text-foreground">Custom Floor Number</span>
          </button>
        )}
      </div>

      {showCustomFloor && customSelected && (
        <Input
          label="Custom floor number (5 or above)"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 5"
          value={customFloorNumber}
          onChange={(e) => onCustomChange?.(true, e.target.value.replace(/[^\d]/g, ''))}
          error={customError ?? undefined}
        />
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

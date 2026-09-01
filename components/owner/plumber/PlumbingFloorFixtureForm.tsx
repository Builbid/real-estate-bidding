'use client';

import { Input } from '@/components/ui/input';
import {
  PLUMBING_FIXTURE_FIELDS,
  emptyPlumbingFixtureDraft,
  plumbingFloorLabel,
  type PlumbingFixtureCountDraft,
  type PlumbingFixtureKind,
  type PlumbingTargetFloor,
} from '@/lib/tradeWorkDetails';

export function PlumbingFloorFixtureForm({
  targetFloors,
  customTargetFloors,
  values,
  onChange,
}: {
  targetFloors: PlumbingTargetFloor[];
  customTargetFloors: string;
  values: Partial<Record<PlumbingTargetFloor, PlumbingFixtureCountDraft>>;
  onChange: (value: Partial<Record<PlumbingTargetFloor, PlumbingFixtureCountDraft>>) => void;
}) {
  function updateField(floor: PlumbingTargetFloor, key: PlumbingFixtureKind, raw: string) {
    const current = values[floor] ?? emptyPlumbingFixtureDraft();
    onChange({
      ...values,
      [floor]: {
        ...current,
        [key]: raw.replace(/[^\d]/g, '').slice(0, 2),
      },
    });
  }

  if (targetFloors.length === 0) {
    return (
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
        Go back and select at least one target work floor to enter fixture quantities.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        Enter fixture quantities separately for each selected floor. Use 0 if a floor does not need that item.
      </p>
      {targetFloors.map((floor) => {
        const counts = values[floor] ?? emptyPlumbingFixtureDraft();
        return (
          <div
            key={floor}
            className="rounded-xl border-2 border-border bg-secondary/15 overflow-hidden"
          >
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {plumbingFloorLabel(floor, customTargetFloors)}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                How many of each fixture on this floor?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
              {PLUMBING_FIXTURE_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={counts[field.key]}
                  onChange={(e) => updateField(floor, field.key, e.target.value)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

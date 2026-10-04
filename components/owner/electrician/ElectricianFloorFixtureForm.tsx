'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { FORM_SURFACE } from '@/components/owner/wizard/formTheme';
import { FloorCopyFromSelect } from '@/components/owner/wizard/FloorCopyFromSelect';
import {
  FLOOR_COPY_MANUAL_VALUE,
  copyDraftFields,
  resolveFloorCopySource,
  sortTargetFloors,
  type FloorCopyOption,
} from '@/lib/floorCopy';
import {
  ELECTRICIAN_FIXTURE_FIELDS,
  ELECTRICIAN_FIXTURE_KIND_KEYS,
  emptyElectricianFixtureDraft,
  plumbingFloorLabel,
  type ElectricianFixtureCountDraft,
  type ElectricianFixtureKind,
  type PlumbingHouseStructure,
  type PlumbingTargetFloor,
} from '@/lib/tradeWorkDetails';

export function ElectricianFloorFixtureForm({
  targetFloors,
  customTargetFloors,
  values,
  onChange,
  houseStructure = null,
}: {
  targetFloors: PlumbingTargetFloor[];
  customTargetFloors: string | number[];
  values: Partial<Record<PlumbingTargetFloor, ElectricianFixtureCountDraft>>;
  onChange: (value: Partial<Record<PlumbingTargetFloor, ElectricianFixtureCountDraft>>) => void;
  houseStructure?: PlumbingHouseStructure | null;
}) {
  // Per floor: undefined = nothing chosen yet, '' = manual entry, otherwise the source floor.
  const [copySources, setCopySources] = useState<
    Partial<Record<PlumbingTargetFloor, string>>
  >({});

  function updateField(floor: PlumbingTargetFloor, key: ElectricianFixtureKind, raw: string) {
    const current = values[floor] ?? emptyElectricianFixtureDraft();
    onChange({
      ...values,
      [floor]: {
        ...current,
        [key]: raw.replace(/[^\d]/g, '').slice(0, 2),
      },
    });
  }

  function copyFromFloor(floor: PlumbingTargetFloor, source: string) {
    setCopySources((prev) => ({ ...prev, [floor]: source }));
    const current = values[floor] ?? emptyElectricianFixtureDraft();
    if (source === FLOOR_COPY_MANUAL_VALUE) {
      // Deselect / Clear / Manual: reset the auto-filled quantities.
      onChange({ ...values, [floor]: emptyElectricianFixtureDraft() });
      return;
    }
    const from = values[source as PlumbingTargetFloor] ?? emptyElectricianFixtureDraft();
    onChange({
      ...values,
      [floor]: copyDraftFields(ELECTRICIAN_FIXTURE_KIND_KEYS, from, current),
    });
  }

  if (targetFloors.length === 0) {
    return (
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
        Go back and select at least one target work floor to enter fixture quantities.
      </p>
    );
  }

  const orderedFloors = sortTargetFloors(targetFloors);

  return (
    <div className="space-y-4">
      {orderedFloors.map((floor, index) => {
        const counts = values[floor] ?? emptyElectricianFixtureDraft();
        const copyOptions: FloorCopyOption[] = orderedFloors.slice(0, index).map((prev) => ({
          value: prev,
          label: plumbingFloorLabel(prev, customTargetFloors, houseStructure),
        }));
        return (
          <div
            key={floor}
            className={`${FORM_SURFACE} overflow-hidden`}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-blue-600 px-4 py-2.5">
              <h3 className="text-sm font-bold tracking-wide text-white">
                {plumbingFloorLabel(floor, customTargetFloors, houseStructure)}
              </h3>
              <FloorCopyFromSelect
                variant="onBlue"
                options={copyOptions}
                value={resolveFloorCopySource(copySources[floor], copyOptions)}
                onChange={(source) => copyFromFloor(floor, source)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 items-start p-4">
              {ELECTRICIAN_FIXTURE_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  compact
                  label={field.label}
                  className="h-10 px-3 py-1.5"
                  type="text"
                  inputMode="numeric"
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

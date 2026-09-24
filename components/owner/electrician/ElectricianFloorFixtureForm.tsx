'use client';

import { Input } from '@/components/ui/input';
import { FORM_SURFACE } from '@/components/owner/wizard/formTheme';
import {
  ELECTRICIAN_FIXTURE_FIELDS,
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

  if (targetFloors.length === 0) {
    return (
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
        Go back and select at least one target work floor to enter fixture quantities.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {targetFloors.map((floor) => {
        const counts = values[floor] ?? emptyElectricianFixtureDraft();
        return (
          <div
            key={floor}
            className={`${FORM_SURFACE} overflow-hidden`}
          >
            <div className="bg-blue-600 px-4 py-2.5">
              <h3 className="text-sm font-bold tracking-wide text-white">
                {plumbingFloorLabel(floor, customTargetFloors, houseStructure)}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4">
              {ELECTRICIAN_FIXTURE_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
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

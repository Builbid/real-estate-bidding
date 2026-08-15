'use client';

import { Input } from '@/components/ui/input';
import { OptionSelectCard, OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { StartTimeAndNotes, WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import { StepperInput } from '@/components/owner/wizard/StepperInput';
import {
  CARPENTER_SCOPE_OPTIONS,
  EARTHWORK_MACHINE_OPTIONS,
  EARTHWORK_TYPE_OPTIONS,
  ELECTRICIAN_APPLIANCE_OPTIONS,
  ELECTRICIAN_POINT_OPTIONS,
  ELECTRICIAN_SCOPE_OPTIONS,
  INTERIOR_SCOPE_OPTIONS,
  INTERIOR_SPACE_OPTIONS,
  PLUMBER_SCOPE_OPTIONS,
  type CarpenterScopeType,
  type EarthworkMachine,
  type EarthworkType,
  type ElectricianHeavyAppliance,
  type ElectricianPointEstimate,
  type ElectricianScopeType,
  type InteriorScopeType,
  type InteriorTargetSpace,
  type PlumberScopeType,
  type ProjectStartTimeType,
  type TradeWorkService,
} from '@/lib/tradeWorkDetails';

export interface TradeWorkFormFields {
  plumberScope: PlumberScopeType;
  bathrooms: number;
  kitchens: number;
  overheadTank: boolean | null;
  concealedPiping: boolean | null;
  electricianScope: ElectricianScopeType;
  pointEstimate: ElectricianPointEstimate | null;
  heavyAppliances: ElectricianHeavyAppliance[];
  concealedWiring: boolean | null;
  carpenterScope: CarpenterScopeType | null;
  interiorScope: InteriorScopeType | null;
  targetSpaces: InteriorTargetSpace[];
  interiorArea: string;
  earthworkType: EarthworkType | null;
  machineRequirement: EarthworkMachine | null;
  estimatedDepth: string;
  approxVolume: string;
  projectStartTimeType: ProjectStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}

const YES_NO = [
  { value: 'yes' as const, label: 'Yes' },
  { value: 'no' as const, label: 'No' },
];

function toggleUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function TradeWorkRequirementsFields({
  trade,
  form,
  onChange,
}: {
  trade: TradeWorkService;
  form: TradeWorkFormFields;
  onChange: <K extends keyof TradeWorkFormFields>(key: K, value: TradeWorkFormFields[K]) => void;
}) {
  return (
    <div className="space-y-5">
      {trade === 'plumber' && (
        <>
          <FieldGroup label="Scope Type">
            <OptionSelectCard
              selected
              disabled
              label={PLUMBER_SCOPE_OPTIONS[0].label}
              onClick={() => {}}
            />
          </FieldGroup>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StepperInput
              label="Number of Bathrooms"
              value={form.bathrooms}
              onChange={(v) => onChange('bathrooms', v)}
              min={1}
              max={3}
            />
            <StepperInput
              label="Number of Kitchens"
              value={form.kitchens}
              onChange={(v) => onChange('kitchens', v)}
              min={1}
              max={3}
            />
          </div>
          <FieldGroup label="Overhead Water Tank Installation">
            <OptionSelectGrid
              options={YES_NO}
              value={form.overheadTank == null ? null : form.overheadTank ? 'yes' : 'no'}
              onSelect={(v) => onChange('overheadTank', v === 'yes')}
              columns={2}
            />
          </FieldGroup>
          <FieldGroup label="Concealed CPVC/uPVC Piping">
            <OptionSelectGrid
              options={YES_NO}
              value={form.concealedPiping == null ? null : form.concealedPiping ? 'yes' : 'no'}
              onSelect={(v) => onChange('concealedPiping', v === 'yes')}
              columns={2}
            />
          </FieldGroup>
        </>
      )}

      {trade === 'electrician' && (
        <>
          <FieldGroup label="Scope Type">
            <OptionSelectCard
              selected
              disabled
              label={ELECTRICIAN_SCOPE_OPTIONS[0].label}
              onClick={() => {}}
            />
          </FieldGroup>
          <FieldGroup label="Approximate Number of Points">
            <OptionSelectGrid
              options={ELECTRICIAN_POINT_OPTIONS}
              value={form.pointEstimate}
              onSelect={(v) => onChange('pointEstimate', v)}
              columns={2}
            />
          </FieldGroup>
          <FieldGroup label="Concealed Wiring">
            <OptionSelectGrid
              options={YES_NO}
              value={form.concealedWiring == null ? null : form.concealedWiring ? 'yes' : 'no'}
              onSelect={(v) => onChange('concealedWiring', v === 'yes')}
              columns={2}
            />
          </FieldGroup>
          <FieldGroup label="Heavy Appliances">
            <OptionSelectGrid
              options={ELECTRICIAN_APPLIANCE_OPTIONS}
              values={form.heavyAppliances}
              onToggle={(v) => onChange('heavyAppliances', toggleUnique(form.heavyAppliances, v))}
              columns={2}
            />
          </FieldGroup>
        </>
      )}

      {trade === 'carpenter' && (
        <FieldGroup label="Scope Type">
          <OptionSelectGrid
            options={CARPENTER_SCOPE_OPTIONS}
            value={form.carpenterScope}
            onSelect={(v) => onChange('carpenterScope', v)}
          />
        </FieldGroup>
      )}

      {trade === 'false_ceiling_work' && (
        <>
          <FieldGroup label="Scope Type">
            <OptionSelectGrid
              options={INTERIOR_SCOPE_OPTIONS}
              value={form.interiorScope}
              onSelect={(v) => onChange('interiorScope', v)}
            />
          </FieldGroup>
          <FieldGroup label="Target Space">
            <OptionSelectGrid
              options={INTERIOR_SPACE_OPTIONS}
              values={form.targetSpaces}
              onToggle={(space) => {
                if (space === 'full_house') {
                  onChange(
                    'targetSpaces',
                    form.targetSpaces.includes('full_house') ? [] : ['full_house'],
                  );
                  return;
                }
                const withoutFull = form.targetSpaces.filter((s) => s !== 'full_house');
                onChange('targetSpaces', toggleUnique(withoutFull, space));
              }}
              columns={2}
            />
          </FieldGroup>
          <Input
            label="Approximate Interior Area (Sq. Ft.)"
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="e.g. 1400"
            value={form.interiorArea}
            onChange={(e) => onChange('interiorArea', e.target.value)}
          />
        </>
      )}

      {trade === 'earthwork' && (
        <>
          <FieldGroup label="Work Type">
            <OptionSelectGrid
              options={EARTHWORK_TYPE_OPTIONS}
              value={form.earthworkType}
              onSelect={(v) => onChange('earthworkType', v)}
            />
          </FieldGroup>
          <FieldGroup label="Machine Requirement">
            <OptionSelectGrid
              options={EARTHWORK_MACHINE_OPTIONS}
              value={form.machineRequirement}
              onSelect={(v) => onChange('machineRequirement', v)}
            />
          </FieldGroup>
          <Input
            label="Estimated Depth (Ft.)"
            type="number"
            inputMode="decimal"
            min={0.5}
            step="0.5"
            placeholder="e.g. 6"
            value={form.estimatedDepth}
            onChange={(e) => onChange('estimatedDepth', e.target.value)}
          />
          <Input
            label="Approximate Area / Volume (Cu. Ft. / Sq. Ft.)"
            type="text"
            placeholder="e.g. 1200 Sq. Ft. or 800 Cu. Ft."
            value={form.approxVolume}
            onChange={(e) => onChange('approxVolume', e.target.value)}
          />
        </>
      )}

      <StartTimeAndNotes
        startTimeType={form.projectStartTimeType}
        specificDate={form.projectStartTimeSpecificDate}
        additionalRequirements={form.additionalRequirements}
        onStartTimeChange={(v) => {
          onChange('projectStartTimeType', v);
          if (v !== 'specific') onChange('projectStartTimeSpecificDate', '');
        }}
        onSpecificDateChange={(v) => onChange('projectStartTimeSpecificDate', v)}
        onNotesChange={(v) => onChange('additionalRequirements', v)}
      />
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={WIZARD_SECTION_LABEL}>{label}</label>
      {children}
    </div>
  );
}

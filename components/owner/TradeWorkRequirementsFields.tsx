'use client';

import { BathroomPackageSelector } from '@/components/owner/plumber/BathroomPackageSelector';
import { PipingOptionSelector } from '@/components/owner/plumber/PipingOptionSelector';
import { Input } from '@/components/ui/input';
import { OptionSelectCard, OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { StartTimeAndNotes, WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import { StepperInput } from '@/components/owner/wizard/StepperInput';
import { cn } from '@/lib/utils';
import {
  EARTHWORK_SOIL_VEHICLE_OPTIONS,
  EARTHWORK_TYPE_OPTIONS,
  ELECTRICIAN_APPLIANCE_OPTIONS,
  ELECTRICIAN_POINT_OPTIONS,
  ELECTRICIAN_SCOPE_OPTIONS,
  INTERIOR_SCOPE_OPTIONS,
  INTERIOR_SPACE_OPTIONS,
  PLUMBER_SCOPE_OPTIONS,
  type BathroomPackage,
  type CpvcPipeSize,
  type DrainageInstallMethod,
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
  type WaterInstallMethod,
} from '@/lib/tradeWorkDetails';

export interface TradeWorkFormFields {
  plumberScope: PlumberScopeType;
  bathrooms: number;
  kitchens: number;
  overheadTank: boolean | null;
  concealedPiping: boolean | null;
  bathroomPackage: BathroomPackage | null;
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: boolean;
  drainageInstallMethods: DrainageInstallMethod[];
  electricianScope: ElectricianScopeType;
  pointEstimate: ElectricianPointEstimate | null;
  heavyAppliances: ElectricianHeavyAppliance[];
  concealedWiring: boolean | null;
  doorWindowFramesQuantity: string;
  kitchenSizeLayout: string;
  kitchenMaterialType: string;
  kitchenFittingsHardware: string;
  interiorScope: InteriorScopeType | null;
  targetSpaces: InteriorTargetSpace[];
  interiorArea: string;
  earthworkType: EarthworkType | null;
  machineRequirement: EarthworkMachine | null;
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
          <BathroomPackageSelector
            value={form.bathroomPackage}
            onChange={(v) => onChange('bathroomPackage', v)}
          />
          <PipingOptionSelector
            cpvcPipeSizes={form.cpvcPipeSizes}
            waterInstallMethods={form.waterInstallMethods}
            includeToiletWastePipe={form.includeToiletWastePipe}
            drainageInstallMethods={form.drainageInstallMethods}
            onChangeSizes={(v) => onChange('cpvcPipeSizes', v)}
            onChangeWaterMethods={(v) => onChange('waterInstallMethods', v)}
            onChangeIncludeWaste={(v) => onChange('includeToiletWastePipe', v)}
            onChangeDrainageMethods={(v) => onChange('drainageInstallMethods', v)}
          />
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

      {trade === 'false_ceiling_work' && (
        <>
          <FieldGroup label="Scope Type">
            <OptionSelectGrid
              options={INTERIOR_SCOPE_OPTIONS}
              value={form.interiorScope}
              onSelect={(v) => onChange('interiorScope', v)}
            />
          </FieldGroup>
          {form.interiorScope === 'modular_kitchen' && (
            <ExpandablePanel open>
              <Input
                label="Kitchen Size / Layout"
                type="text"
                required
                placeholder="e.g., L-shaped, 12 ft running length / 25 sqft"
                value={form.kitchenSizeLayout}
                onChange={(e) => onChange('kitchenSizeLayout', e.target.value)}
              />
              <Input
                label="Material Type"
                type="text"
                required
                placeholder="e.g., HDMR Board, Marine Plywood, Pre-laminated"
                value={form.kitchenMaterialType}
                onChange={(e) => onChange('kitchenMaterialType', e.target.value)}
              />
              <Input
                label="Fittings & Hardware"
                type="text"
                required
                placeholder="e.g., Soft-close hinges, tandem boxes, basket fittings"
                value={form.kitchenFittingsHardware}
                onChange={(e) => onChange('kitchenFittingsHardware', e.target.value)}
              />
            </ExpandablePanel>
          )}
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
              onSelect={(v) => {
                onChange('earthworkType', v);
                if (v === 'soil_filling') {
                  if (form.machineRequirement !== 'tractor' && form.machineRequirement !== 'dumper') {
                    onChange('machineRequirement', null);
                  }
                } else {
                  onChange('machineRequirement', 'jcb_excavator');
                }
              }}
            />
          </FieldGroup>
          {form.earthworkType === 'soil_filling' && (
            <FieldGroup label="Vehicle Type for Soil Filling">
              <OptionSelectGrid
                options={EARTHWORK_SOIL_VEHICLE_OPTIONS}
                value={
                  form.machineRequirement === 'tractor' || form.machineRequirement === 'dumper'
                    ? form.machineRequirement
                    : null
                }
                onSelect={(v) => onChange('machineRequirement', v)}
                columns={2}
              />
            </FieldGroup>
          )}
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

function ExpandablePanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-in-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
      aria-hidden={!open}
    >
      <div className="overflow-hidden" inert={!open || undefined}>
        <div
          className={cn(
            'mt-3 space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5',
            !open && 'pointer-events-none',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={WIZARD_SECTION_LABEL}>
        {label}
        {hint ? (
          <span className="ml-1.5 normal-case tracking-normal font-medium text-gray-600 dark:text-zinc-400">
            {hint}
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

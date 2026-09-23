'use client';

import { PlumbingFloorFixtureForm } from '@/components/owner/plumber/PlumbingFloorFixtureForm';
import { ElectricianFloorFixtureForm } from '@/components/owner/electrician/ElectricianFloorFixtureForm';
import { InteriorPackageForm } from '@/components/owner/interior/InteriorPackageForm';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { FieldError, messageMatches } from '@/components/owner/wizard/fieldValidation';
import { StartTimeAndNotes, WIZARD_SECTION_LABEL, withSectionColon } from '@/components/owner/wizard/StartTimeAndNotes';
import { cn } from '@/lib/utils';
import {
  EARTHWORK_SOIL_VEHICLE_OPTIONS,
  EARTHWORK_TYPE_OPTIONS,
  ELECTRICIAN_WIRING_TYPE_OPTIONS,
  ELECTRICIAN_LABOUR_ONLY_DISCLAIMER,
  INTERIOR_DESIGNER_LABOUR_ONLY_DISCLAIMER,
  PLUMBING_FITTING_TYPE_OPTIONS,
  PLUMBING_LABOUR_ONLY_DISCLAIMER,
  type BathroomPackage,
  type BathroomPackageSelection,
  type BathroomRoomSize,
  type DrainageInstallMethod,
  type EarthworkMachine,
  type EarthworkType,
  type ElectricianPackageKind,
  type ElectricianSubOptionId,
  type ElectricianFixtureCountDraft,
  type ElectricianWiringType,
  type InteriorDesignerPackageKind,
  type InteriorDesignerSubOptionId,
  type InteriorScopeType,
  type InteriorTargetSpace,
  type PipingPackageKind,
  type PlumbingBuildingStoreys,
  type PlumbingFloorLevel,
  type PlumbingHouseStructure,
  type PlumbingPackageKind,
  type PlumbingSubOptionId,
  type PlumbingTargetFloor,
  type PlumbingFixtureCountDraft,
  type PlumbingFittingType,
  type PlumbingWaterTankFloor,
  type PlumberScopeType,
  type ProjectStartTimeType,
  type TankDistance,
  type TradeWorkService,
  type WaterInstallMethod,
  type CpvcPipeSize,
} from '@/lib/tradeWorkDetails';

export interface TradeWorkFormFields {
  plumberScope: PlumberScopeType;
  bathrooms: number;
  kitchens: number;
  overheadTank: boolean | null;
  concealedPiping: boolean | null;
  bathroomPackage: BathroomPackage | null;
  bathroomSize: BathroomRoomSize | null;
  plumbingFloorLevel: PlumbingFloorLevel;
  fittingType: WaterInstallMethod;
  tankDistance: TankDistance | null;
  houseStructure: PlumbingHouseStructure | null;
  targetFloors: PlumbingTargetFloor[];
  targetWorkFloor: PlumbingTargetFloor | null;
  customTargetFloors: number[];
  buildingStoreys: PlumbingBuildingStoreys | null;
  approxBuiltUpAreaSqft: string;
  selectedPackages: PlumbingPackageKind[];
  selectedSubOptions: PlumbingSubOptionId[];
  floorFixtureCounts: Partial<Record<PlumbingTargetFloor, PlumbingFixtureCountDraft>>;
  plumbingFittingType: PlumbingFittingType | null;
  estimatedLongConnectionLengthFt: string;
  waterTankFloor: PlumbingWaterTankFloor | null;
  customWaterTankFloor: string;
  bathroomPackages: BathroomPackageSelection[];
  pipingPackage: PipingPackageKind | null;
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: boolean;
  drainageInstallMethods: DrainageInstallMethod[];
  electricianPackages: ElectricianPackageKind[];
  electricianSubOptions: ElectricianSubOptionId[];
  electricianFloorFixtureCounts: Partial<Record<PlumbingTargetFloor, ElectricianFixtureCountDraft>>;
  electricianWiringType: ElectricianWiringType | null;
  interiorPackages: InteriorDesignerPackageKind[];
  interiorSubOptions: InteriorDesignerSubOptionId[];
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

export function TradeWorkRequirementsFields({
  trade,
  form,
  onChange,
  error = null,
}: {
  trade: TradeWorkService;
  form: TradeWorkFormFields;
  onChange: <K extends keyof TradeWorkFormFields>(key: K, value: TradeWorkFormFields[K]) => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-4">
      {trade === 'plumber' && (
        <>
          <p className="text-xs font-medium leading-relaxed rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-amber-100">
            {PLUMBING_LABOUR_ONLY_DISCLAIMER}
          </p>
        <PlumbingFloorFixtureForm
          targetFloors={form.targetFloors}
          customTargetFloors={form.customTargetFloors}
          values={form.floorFixtureCounts}
          highlightEmpty={messageMatches(error, 'for each selected floor') || messageMatches(error, 'fixture')}
          onChange={(v) => onChange('floorFixtureCounts', v)}
        />
        <FieldGroup label="Fitting Type" invalid={messageMatches(error, 'fitting')} message={messageMatches(error, 'fitting') ? error : undefined}>
          <OptionSelectGrid
            options={PLUMBING_FITTING_TYPE_OPTIONS}
            value={form.plumbingFittingType}
            onSelect={(v) => {
              onChange('plumbingFittingType', v);
              onChange(
                'fittingType',
                v === 'concealed' ? 'concealed_wall_cutting' : 'open_outer_fitting',
              );
              onChange('concealedPiping', v === 'concealed');
            }}
            columns={2}
          />
        </FieldGroup>
        </>
      )}

      {trade === 'electrician' && (
        <>
          <p className="text-xs font-medium leading-relaxed rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-amber-100">
            {ELECTRICIAN_LABOUR_ONLY_DISCLAIMER}
          </p>
          <ElectricianFloorFixtureForm
            targetFloors={form.targetFloors}
            customTargetFloors={form.customTargetFloors}
            values={form.electricianFloorFixtureCounts}
            highlightEmpty={messageMatches(error, 'for each selected floor') || messageMatches(error, 'fixture')}
            onChange={(v) => onChange('electricianFloorFixtureCounts', v)}
          />
          <FieldGroup label="Wiring Type" invalid={messageMatches(error, 'wiring')} message={messageMatches(error, 'wiring') ? error : undefined}>
            <OptionSelectGrid
              options={ELECTRICIAN_WIRING_TYPE_OPTIONS}
              value={form.electricianWiringType}
              onSelect={(v) => onChange('electricianWiringType', v)}
              columns={2}
            />
          </FieldGroup>
        </>
      )}

      {trade === 'false_ceiling_work' && (
        <>
          <p className="text-xs font-medium leading-relaxed rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-amber-100">
            {INTERIOR_DESIGNER_LABOUR_ONLY_DISCLAIMER}
          </p>
          <div
            className={cn('rounded-xl', messageMatches(error, 'work item') && 'ring-1 ring-red-500')}
            data-field-invalid={messageMatches(error, 'work item') ? 'true' : undefined}
          >
          <InteriorPackageForm
            selectedPackages={form.interiorPackages}
            selectedSubOptions={form.interiorSubOptions}
            onChangePackages={(v) => onChange('interiorPackages', v)}
            onChangeSubOptions={(v) => onChange('interiorSubOptions', v)}
          />
          <FieldError message={messageMatches(error, 'work item') ? error : undefined} />
          </div>
        </>
      )}

      {trade === 'earthwork' && (
        <>
          <FieldGroup
            label="Work Type"
            invalid={messageMatches(error, 'earthwork type')}
            message={messageMatches(error, 'earthwork type') ? error : undefined}
          >
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
            <FieldGroup
              label="Vehicle Type for Soil Filling"
              invalid={messageMatches(error, 'tractor') || messageMatches(error, 'dumper')}
              message={messageMatches(error, 'tractor') || messageMatches(error, 'dumper') ? error : undefined}
            >
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
        error={error}
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
  hint,
  children,
  invalid = false,
  message,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  invalid?: boolean;
  message?: string | null;
}) {
  return (
    <div
      className={cn('space-y-4 rounded-xl', invalid && 'ring-1 ring-red-500')}
      data-field-invalid={invalid ? 'true' : undefined}
    >
      <label className={WIZARD_SECTION_LABEL}>
        {withSectionColon(label)}
        {hint ? (
          <span className="ml-1.5 normal-case tracking-normal font-medium text-slate-700 dark:text-slate-300">
            {hint}
          </span>
        ) : null}
      </label>
      {children}
      <FieldError message={message} />
    </div>
  );
}

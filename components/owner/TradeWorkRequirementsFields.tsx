'use client';

import { PlumbingPackageForm } from '@/components/owner/plumber/PlumbingPackageForm';
import { ElectricianPackageForm } from '@/components/owner/electrician/ElectricianPackageForm';
import { InteriorPackageForm } from '@/components/owner/interior/InteriorPackageForm';
import { Input } from '@/components/ui/input';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { StartTimeAndNotes, WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import {
  EARTHWORK_SOIL_VEHICLE_OPTIONS,
  EARTHWORK_TYPE_OPTIONS,
  type BathroomPackage,
  type BathroomPackageSelection,
  type BathroomRoomSize,
  type DrainageInstallMethod,
  type EarthworkMachine,
  type EarthworkType,
  type ElectricianPackageKind,
  type ElectricianSubOptionId,
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
  customTargetFloors: string;
  buildingStoreys: PlumbingBuildingStoreys | null;
  approxBuiltUpAreaSqft: string;
  selectedPackages: PlumbingPackageKind[];
  selectedSubOptions: PlumbingSubOptionId[];
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
}: {
  trade: TradeWorkService;
  form: TradeWorkFormFields;
  onChange: <K extends keyof TradeWorkFormFields>(key: K, value: TradeWorkFormFields[K]) => void;
}) {
  return (
    <div className="space-y-5">
      {trade === 'plumber' && (
        <>
          <p className="text-xs font-medium leading-relaxed rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-gray-800 dark:text-zinc-200">
            All bids are strictly for LABOUR CHARGES. Materials must be supplied by the Property Owner.
          </p>
        <PlumbingPackageForm
          selectedPackages={form.selectedPackages}
          selectedSubOptions={form.selectedSubOptions}
          houseStructure={form.houseStructure}
          waterTankFloor={form.waterTankFloor}
          customWaterTankFloor={form.customWaterTankFloor}
          onChangePackages={(v) => onChange('selectedPackages', v)}
          onChangeSubOptions={(v) => onChange('selectedSubOptions', v)}
          onChangeWaterTankFloor={(v) => onChange('waterTankFloor', v)}
          onChangeCustomWaterTankFloor={(v) => onChange('customWaterTankFloor', v)}
        />
        </>
      )}

      {trade === 'electrician' && (
        <>
          <p className="text-xs font-medium leading-relaxed rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-gray-800 dark:text-zinc-200">
            All bids are strictly for LABOUR CHARGES. Materials must be supplied by the Property Owner.
          </p>
          <ElectricianPackageForm
            selectedPackages={form.electricianPackages}
            selectedSubOptions={form.electricianSubOptions}
            onChangePackages={(v) => onChange('electricianPackages', v)}
            onChangeSubOptions={(v) => onChange('electricianSubOptions', v)}
          />
        </>
      )}

      {trade === 'false_ceiling_work' && (
        <>
          <p className="text-xs font-medium leading-relaxed rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-gray-800 dark:text-zinc-200">
            All bids are strictly for LABOUR CHARGES. Materials must be supplied by the Property Owner.
          </p>
          <InteriorPackageForm
            selectedPackages={form.interiorPackages}
            selectedSubOptions={form.interiorSubOptions}
            onChangePackages={(v) => onChange('interiorPackages', v)}
            onChangeSubOptions={(v) => onChange('interiorSubOptions', v)}
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

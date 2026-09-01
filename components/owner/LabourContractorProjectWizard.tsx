'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import type { BuildingType } from '@/lib/buildingConfig';
import { ASSAM_BUILDING_TYPE } from '@/lib/buildingConfig';
import {
  getCustomFloorSequenceInvalidMessage,
  FOUNDATION_CAPACITY_INVALID_MESSAGE,
  FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE,
  MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS,
  MISTRI_ASSAM_ROOF_OPTIONS,
  MISTRI_ASSAM_ROOFING_SHEET_OPTIONS,
  MISTRI_BRICKWORK_MATERIAL_OPTIONS,
  MISTRI_CHOWKHAT_HINT,
  MISTRI_CHOWKHAT_LABEL,
  MISTRI_CHOWKHAT_RATE_NOTE,
  MISTRI_CHOWKHAT_SECTION_LABEL,
  MISTRI_CONTRACT_TYPE_OPTIONS,
  MISTRI_CUSTOM_FLOOR_ID,
  MISTRI_RCC_SCOPE_OPTIONS,
  MISTRI_START_TIME_OPTIONS,
  MISTRI_YES_NO_OPTIONS,
  UPPER_FLOOR_WALL_REQUIRES_EXISTING_GF_STRUCTURE,
  currentFloorPlanFromFloorWork,
  floorPlanUpperCount,
  formatMistriFloorWorkLabel,
  formatMistriRccScopeDescription,
  getMistriFullFinishedIncludes,
  getMistriRccScopeLabel,
  getMistriWorkRequirementBlocks,
  isAssamMistriFloor,
  isUpperFloorWallScopeBlocked,
  mistriContractTypeRequiredForFloorWork,
  mistriFoundationProvisionRequired,
  parseCustomFloorSequence,
  parseFoundationCustomFloorCount,
  parseApproximateAreaSqft,
  parseFoundationDepthFt,
  rccScopeFromWorkTypes,
  sortMistriFloorWork,
  validateMistriFloorWorkInput,
  workTypesFromRccScope,
  type MistriAssamRoofType,
  type MistriAssamRoofingSheet,
  type MistriBrickworkMaterial,
  type MistriContractType,
  type MistriFloorId,
  type MistriFloorWork,
  type MistriFloorWorkType,
  type MistriFlooringMaterial,
  type MistriPlasterScope,
  type MistriRccScopeOption,
  type MistriStartTimeType,
} from '@/lib/mistriDetails';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3 | 4;

const BIDDING_MINUTES = 7;

const SECTION_LABEL =
  'text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider';
const HELPER_TEXT =
  'text-[11px] font-medium text-gray-700 dark:text-zinc-300 leading-relaxed';

interface FloorWorkForm {
  workTypes: MistriFloorWorkType[];
  brickMaterial: MistriBrickworkMaterial | null;
  plasterScope: MistriPlasterScope | null;
  flooringMaterial: MistriFlooringMaterial | null;
  includeFineFlooring: boolean | null;
  assamRoofType: MistriAssamRoofType | null;
  assamRoofingSheet: MistriAssamRoofingSheet | null;
  foundationDepthFt: string;
}

const EMPTY_FLOOR_WORK: FloorWorkForm = {
  workTypes: [],
  brickMaterial: null,
  plasterScope: null,
  flooringMaterial: null,
  includeFineFlooring: null,
  assamRoofType: null,
  assamRoofingSheet: null,
  foundationDepthFt: '',
};

const ASSAM_FULL_FINISHED_WORK: FloorWorkForm = {
  ...EMPTY_FLOOR_WORK,
  workTypes: ['full_finished'],
};

function OptionCardButton({
  selected,
  onClick,
  children,
  className,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
        selected
          ? 'border-emerald-500/70 bg-emerald-500/15 text-gray-900 dark:text-white'
          : 'border-border bg-card text-gray-800 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500',
        disabled && 'cursor-not-allowed opacity-50 hover:border-border',
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {selected ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
      ) : (
        <span
          aria-hidden
          className="h-4 w-4 flex-shrink-0 rounded-full border border-gray-300 dark:border-zinc-500"
        />
      )}
    </button>
  );
}

function NestedChoiceButtons<T extends string>({
  question,
  options,
  value,
  onChange,
}: {
  question: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{question}</p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <OptionCardButton
            key={opt.value}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </OptionCardButton>
        ))}
      </div>
    </div>
  );
}

const PROGRESS_LABELS = [
  'Project Info',
  'Work Requirements',
  'Review & Launch',
] as const;

type MistriHouseType = 'assam' | 'rcc';

const MISTRI_HOUSE_TYPE_OPTIONS: {
  value: MistriHouseType;
  label: string;
  note: string;
}[] = [
  {
    value: 'assam',
    label: 'Assam Type',
    note: 'Single-storey Assam Type house — roof truss, roofing sheet, and foundation depth on the next step.',
  },
  {
    value: 'rcc',
    label: 'RCC Structure',
    note: 'RCC multi-storey construction — select floors, then choose Scope of Work for each floor.',
  },
];

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  houseType: MistriHouseType | null;
  buildingTypes: BuildingType[];
  customFloorSelected: boolean;
  customFloorNumber: string;
  floorWorkById: Record<string, FloorWorkForm>;
  approximateArea: string;
  /** Whole-number floor count for foundation provision (Ground Floor major only). */
  futureFloorCustom: string;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
  includeDoorWindowFrames: boolean;
}

const EMPTY_FORM: FormState = {
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  houseType: null,
  buildingTypes: [],
  customFloorSelected: false,
  customFloorNumber: '',
  floorWorkById: {},
  approximateArea: '',
  futureFloorCustom: '',
  contractType: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
  includeDoorWindowFrames: false,
};

function selectedFloorEntries(form: FormState): Array<{
  floorId: MistriFloorId;
  customFloorNumber: number | null;
}> {
  const entries: Array<{ floorId: MistriFloorId; customFloorNumber: number | null }> =
    form.buildingTypes.map((floorId) => ({ floorId, customFloorNumber: null }));

  if (form.customFloorSelected) {
    const sequence = parseCustomFloorSequence(form.customFloorNumber, {
      requireStartAt5: form.buildingTypes.includes('RCC 4th Floor'),
    });
    if (sequence) {
      for (const n of sequence) {
        entries.push({ floorId: MISTRI_CUSTOM_FLOOR_ID, customFloorNumber: n });
      }
    }
  }
  return entries;
}

function floorWorkKey(
  floorId: MistriFloorId,
  customFloorNumber?: number | null,
): string {
  if (floorId === MISTRI_CUSTOM_FLOOR_ID) return `custom:${customFloorNumber ?? ''}`;
  return floorId;
}

function pruneFloorWorkById(
  floorWorkById: Record<string, FloorWorkForm>,
  entries: Array<{ floorId: MistriFloorId; customFloorNumber: number | null }>,
): Record<string, FloorWorkForm> {
  const keep = new Set(entries.map((e) => floorWorkKey(e.floorId, e.customFloorNumber)));
  const next: Record<string, FloorWorkForm> = {};
  for (const [key, value] of Object.entries(floorWorkById)) {
    if (keep.has(key)) next[key] = value;
  }
  return next;
}

export function LabourContractorProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    pincode?: string;
    builtUpArea?: string;
    houseType?: string;
    floors?: string;
    customFloor?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submittedTitle, setSubmittedTitle] = useState('');

  const districtSelection = parseAssamDistrictSelection(form.location);
  const requireCustomStartAt5 = form.buildingTypes.includes('RCC 4th Floor');
  const parsedCustomSequence = parseCustomFloorSequence(form.customFloorNumber, {
    requireStartAt5: requireCustomStartAt5,
  });

  const assembledFloorWork: MistriFloorWork[] = useMemo(() => {
    const entries = selectedFloorEntries(form);
    return sortMistriFloorWork(
      entries.map((entry) => {
        const key = floorWorkKey(entry.floorId, entry.customFloorNumber);
        const work = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
        const isAssam = isAssamMistriFloor(entry.floorId);
        const workTypes = isAssam ? (['full_finished'] as MistriFloorWorkType[]) : work.workTypes;
        const scopeOption = isAssam ? null : rccScopeFromWorkTypes(workTypes);
        return {
          floorId: entry.floorId,
          customFloorNumber: entry.customFloorNumber,
          workTypes,
          brickMaterial: work.brickMaterial,
          plasterScope: work.plasterScope,
          flooringMaterial: work.flooringMaterial,
          includeFineFlooring: work.includeFineFlooring,
          scopeOption,
          scopeLabel:
            scopeOption
              ? formatMistriRccScopeDescription(
                  entry.floorId,
                  scopeOption,
                  work.includeFineFlooring === true,
                  work.brickMaterial,
                )
              : null,
          assamRoofType: isAssam ? work.assamRoofType : null,
          assamRoofingSheet: isAssam ? work.assamRoofingSheet : null,
          foundationDepthFt: isAssam ? parseFoundationDepthFt(work.foundationDepthFt) : null,
        };
      }),
    );
  }, [
    form.buildingTypes,
    form.customFloorSelected,
    form.customFloorNumber,
    form.floorWorkById,
  ]);

  // Assam Type always uses full finishing upto plastering and roof work on Work Requirements.
  useEffect(() => {
    if (step !== 2) return;
    if (!form.buildingTypes.includes(ASSAM_BUILDING_TYPE)) return;
    const key = floorWorkKey(ASSAM_BUILDING_TYPE, null);
    setForm((f) => {
      const current = f.floorWorkById[key];
      if (
        current?.workTypes.length === 1 &&
        current.workTypes[0] === 'full_finished'
      ) {
        return f;
      }
      return {
        ...f,
        floorWorkById: {
          ...f.floorWorkById,
          [key]: {
            ...(current ?? EMPTY_FLOOR_WORK),
            workTypes: ['full_finished'],
            brickMaterial: null,
            plasterScope: null,
          },
        },
      };
    });
  }, [step, form.buildingTypes]);

  const previewTitle = generateProjectTitle({
    serviceType: 'labour_contractor',
    district: districtSelection?.district ?? form.location,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (step1ValidationAttempted && (key === 'location' || key === 'pincode')) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'location') delete next.location;
        if (key === 'pincode') delete next.pincode;
        return next;
      });
    }
  }

  function setHouseType(next: MistriHouseType) {
    setForm((f) => {
      if (f.houseType === next) return f;
      if (next === 'assam') {
        return {
          ...f,
          houseType: 'assam',
          buildingTypes: [ASSAM_BUILDING_TYPE],
          customFloorSelected: false,
          customFloorNumber: '',
          floorWorkById: {
            [ASSAM_BUILDING_TYPE]: { ...ASSAM_FULL_FINISHED_WORK },
          },
          futureFloorCustom: '',
          contractType: 'labor_only',
        };
      }
      return {
        ...f,
        houseType: 'rcc',
        buildingTypes: [],
        customFloorSelected: false,
        customFloorNumber: '',
        floorWorkById: {},
        futureFloorCustom: '',
        contractType: null,
      };
    });
    setStep1Errors((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors.houseType;
      delete nextErrors.floors;
      delete nextErrors.customFloor;
      return nextErrors;
    });
  }

  function setBuildingTypes(nextTypes: BuildingType[]) {
    setForm((f) => {
      // House type Assam is fixed; RCC mode never includes Assam.
      const cleaned =
        f.houseType === 'rcc'
          ? nextTypes.filter((t) => t !== ASSAM_BUILDING_TYPE)
          : f.houseType === 'assam'
            ? [ASSAM_BUILDING_TYPE]
            : nextTypes;
      const draft: FormState = {
        ...f,
        buildingTypes: cleaned,
      };
      const entries = selectedFloorEntries(draft);
      let floorWorkById = pruneFloorWorkById(f.floorWorkById, entries);
      if (f.houseType === 'assam') {
        const key = floorWorkKey(ASSAM_BUILDING_TYPE, null);
        floorWorkById = {
          ...floorWorkById,
          [key]: {
            ...(floorWorkById[key] ?? ASSAM_FULL_FINISHED_WORK),
            workTypes: ['full_finished'],
          },
        };
      }
      const droppedGround =
        f.buildingTypes.includes('RCC Ground Floor') &&
        !cleaned.includes('RCC Ground Floor');
      return {
        ...draft,
        floorWorkById,
        ...(droppedGround ? { futureFloorCustom: '' } : {}),
      };
    });
    setStep1Errors((errors) => {
      const next = { ...errors };
      delete next.floors;
      delete next.customFloor;
      return next;
    });
  }

  function setCustomFloor(selected: boolean, number: string) {
    setForm((f) => {
      if (f.houseType === 'assam') return f;
      const draft: FormState = {
        ...f,
        customFloorSelected: selected,
        customFloorNumber: number,
      };
      return {
        ...draft,
        floorWorkById: pruneFloorWorkById(f.floorWorkById, selectedFloorEntries(draft)),
      };
    });
    setStep1Errors((errors) => {
      const next = { ...errors };
      delete next.floors;
      delete next.customFloor;
      return next;
    });
  }

  function patchFloorWork(
    floorId: MistriFloorId,
    patch: Partial<FloorWorkForm>,
    customFloorNumber?: number | null,
  ) {
    setForm((f) => {
      const key = floorWorkKey(floorId, customFloorNumber);
      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      return {
        ...f,
        floorWorkById: {
          ...f.floorWorkById,
          [key]: { ...current, ...patch },
        },
      };
    });
    setStep2Error(null);
  }

  function setRccScope(
    floorId: MistriFloorId,
    option: MistriRccScopeOption,
    customFloorNumber?: number | null,
  ) {
    setForm((f) => {
      const key = floorWorkKey(floorId, customFloorNumber);
      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      const workTypes = workTypesFromRccScope(option);
      const nextFloor: FloorWorkForm = {
        ...current,
        workTypes,
        brickMaterial: option === 'wall_plaster_only' ? current.brickMaterial : null,
        plasterScope: option === 'wall_plaster_only' ? (current.plasterScope ?? 'both') : null,
        flooringMaterial:
          option === 'full_construction' && current.includeFineFlooring
            ? (current.flooringMaterial ?? 'tile')
            : null,
        includeFineFlooring: option === 'full_construction' ? current.includeFineFlooring === true : null,
      };

      const floorWorkById: Record<string, FloorWorkForm> = {
        ...f.floorWorkById,
        [key]: nextFloor,
      };

      if (floorId === 'RCC Ground Floor' && (option === 'full_construction' || option === 'frame_only')) {
        for (const entry of selectedFloorEntries(f)) {
          if (entry.floorId === 'RCC Ground Floor' || isAssamMistriFloor(entry.floorId)) continue;
          const upperKey = floorWorkKey(entry.floorId, entry.customFloorNumber);
          const upper = floorWorkById[upperKey];
          if (!upper) continue;
          if (rccScopeFromWorkTypes(upper.workTypes) === 'wall_plaster_only') {
            floorWorkById[upperKey] = { ...EMPTY_FLOOR_WORK };
          }
        }
      }

      return { ...f, floorWorkById };
    });
    setStep2Error(null);
  }

  function mistriValidationInput() {
    return {
      floorWork: assembledFloorWork,
      approximateArea: form.approximateArea,
      futureFloorOption: 'custom' as const,
      futureFloorCustom: form.futureFloorCustom,
      contractType: form.houseType === 'assam' ? 'labor_only' : form.contractType,
      projectStartTimeType: form.projectStartTimeType,
      projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
      additionalRequirements: form.additionalRequirements,
      includeDoorWindowFrames: form.includeDoorWindowFrames,
    };
  }

  function tryGoStep2() {
    const errors: typeof step1Errors = {};

    if (!parseAssamDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the list.';
    }

    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) {
      errors.pincode = pincodeError;
    }

    if (parseApproximateAreaSqft(form.approximateArea) == null) {
      errors.builtUpArea = 'Enter the approximate built-up area in sqft.';
    }

    if (!form.houseType) {
      errors.houseType = 'Select Assam Type or RCC Structure.';
    }

    if (form.houseType === 'rcc') {
      if (form.buildingTypes.length === 0 && !form.customFloorSelected) {
        errors.floors = 'Select at least one RCC floor.';
      }
    } else if (form.houseType === 'assam') {
      if (!form.buildingTypes.includes(ASSAM_BUILDING_TYPE)) {
        errors.floors = 'Assam Type house must stay selected.';
      }
    }

    if (form.houseType === 'rcc' && form.customFloorSelected) {
      if (!parsedCustomSequence || parsedCustomSequence.length === 0) {
        errors.customFloor = getCustomFloorSequenceInvalidMessage(requireCustomStartAt5);
      }
    }

    if (Object.keys(errors).length > 0) {
      setStep1ValidationAttempted(true);
      setStep1Errors(errors);
      return;
    }

    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep(2);
  }

  function tryGoStep3() {
    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    if ('error' in validated) {
      setStep2Error(validated.error);
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const districtSelection = parseAssamDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the list.');
      setLoading(false);
      return;
    }

    if (hasContactInfo(form.additionalRequirements)) {
      setError('Remove contact details from additional requirements before submitting.');
      setLoading(false);
      return;
    }

    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    if ('error' in validated) {
      setError(validated.error);
      setLoading(false);
      return;
    }

    const autoTitle = generateProjectTitle({
      serviceType: 'labour_contractor',
      district: districtSelection.district,
    });

    const result = await createProjectAction({
      title: autoTitle,
      mistri_details: validated.details,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSubmittedTitle(autoTitle);
    setStep(4);
    setLoading(false);
  }

  const reviewBlocks = (() => {
    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    return 'details' in validated ? getMistriWorkRequirementBlocks(validated.details) : [];
  })();

  const showFoundationProvision = mistriFoundationProvisionRequired(assembledFloorWork);
  const showContractType =
    form.houseType === 'rcc' && mistriContractTypeRequiredForFloorWork(assembledFloorWork);
  const currentFloorPlan = currentFloorPlanFromFloorWork(assembledFloorWork);
  const currentUpper = floorPlanUpperCount(currentFloorPlan);

  const futureCustomError = (() => {
    if (!showFoundationProvision) return null;
    const raw = form.futureFloorCustom.trim();
    if (!raw) return null;
    const n = parseFoundationCustomFloorCount(raw);
    if (n == null) return FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE;
    if (currentUpper != null && n <= currentUpper) return FOUNDATION_CAPACITY_INVALID_MESSAGE;
    return null;
  })();

  const minFoundationFloors =
    currentUpper != null ? currentUpper + 1 : 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Post Mistri Worker Project</h1>
        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-1">
          Specify civil work scope clearly so mistri workers can bid without disputes.
        </p>
      </div>

      {step < 4 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PROGRESS_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                  i + 1 < step ? 'bg-emerald-500 text-white' :
                  i + 1 === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                  'bg-secondary text-muted-foreground',
                )}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs truncate',
                  i + 1 === step ? 'text-foreground font-semibold' : 'text-gray-700 dark:text-zinc-300 font-medium',
                )}
              >
                {label}
              </span>
              {i < PROGRESS_LABELS.length - 1 && (
                <div className="h-px flex-1 bg-secondary mx-1 min-w-[8px]" />
              )}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 pb-6">
          {error && (
            <div className="flex items-start gap-3 mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Project Information</h2>

              <AssamDistrictAutocomplete
                value={form.location}
                onChange={(v) => update('location', v)}
                error={step1ValidationAttempted ? step1Errors.location : undefined}
              />

              <Input
                label="Pincode"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 781001"
                value={form.pincode}
                onChange={(e) => update('pincode', formatPincodeInput(e.target.value))}
                error={step1ValidationAttempted ? step1Errors.pincode : undefined}
              />

              <Input
                label="Approximate built-up Area (Sqft)"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 1200"
                value={form.approximateArea}
                onChange={(e) => {
                  update('approximateArea', e.target.value);
                  setStep1Errors((prev) => ({ ...prev, builtUpArea: undefined }));
                }}
                error={step1ValidationAttempted ? step1Errors.builtUpArea : undefined}
              />
              <p className={HELPER_TEXT}>
                This built-up area is used as the slab area for every selected floor when Mistris quote their civil rate.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>House type</label>
                <p className={HELPER_TEXT}>
                  Choose Assam Type or RCC Structure. For RCC, select floors next, then choose Scope of Work for each floor.
                </p>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {MISTRI_HOUSE_TYPE_OPTIONS.map((opt) => (
                    <OptionCardButton
                      key={opt.value}
                      selected={form.houseType === opt.value}
                      onClick={() => setHouseType(opt.value)}
                    >
                      <span className="block">
                        <span className="block">{opt.label}</span>
                        <span className="mt-1 block text-[10px] font-medium leading-snug text-muted-foreground normal-case tracking-normal">
                          {opt.note}
                        </span>
                      </span>
                    </OptionCardButton>
                  ))}
                </div>
                {step1ValidationAttempted && step1Errors.houseType && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {step1Errors.houseType}
                  </p>
                )}
              </div>

              {form.houseType === 'rcc' && (
                <div className="flex flex-col gap-1.5">
                  <label className={SECTION_LABEL}>Building / Floor Type</label>
                  <p className={HELPER_TEXT}>
                    Select the RCC floors included in this project. Scope of Work is chosen on the next step for each floor.
                  </p>
                  <BuildingTypeSelector
                    purpose="mistri"
                    rccOnly
                    value={form.buildingTypes}
                    onChange={setBuildingTypes}
                    showCustomFloor
                    customSelected={form.customFloorSelected}
                    customFloorNumber={form.customFloorNumber}
                    onCustomChange={setCustomFloor}
                    error={step1ValidationAttempted ? step1Errors.floors : null}
                    customError={step1ValidationAttempted ? step1Errors.customFloor : null}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
                  Bidding Duration
                </label>
                <Select value={form.bidding_minutes} onValueChange={(v) => update('bidding_minutes', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Minutes (Quick)</SelectItem>
                    <SelectItem value="1440">24 Hours (Standard)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                  After bidding closes you have 5 minutes to select a mistri worker.
                </p>
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Work Requirements</h2>
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 mt-1">
                  {form.buildingTypes.includes(ASSAM_BUILDING_TYPE)
                    ? 'Assam Type — Full finishing upto Plastering and Roof work is included. Choose roof truss, roofing sheet, flooring, and foundation depth.'
                    : 'Choose one Scope of Work for each selected floor. Tile fitting is an optional add-on on Full Construction.'}
                </p>
              </div>

              {step2Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              {assembledFloorWork.map((fw) => {
                const key = floorWorkKey(fw.floorId, fw.customFloorNumber);
                const entry = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
                const isAssam = isAssamMistriFloor(fw.floorId);
                const selectedScope = rccScopeFromWorkTypes(entry.workTypes);
                const wallBlocked = isUpperFloorWallScopeBlocked(fw.floorId, assembledFloorWork);
                const title = formatMistriFloorWorkLabel(fw);

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className={HELPER_TEXT}>
                        {isAssam
                          ? 'Full finishing upto Plastering and Roof work is included. Select roof truss, roofing sheet, flooring, and foundation depth.'
                          : 'Select one Scope of Work for this floor.'}
                      </p>
                    </div>

                    {isAssam ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
                            Full finishing upto Plastering and Roof work
                          </p>
                          <p className={cn('mt-1', HELPER_TEXT)}>
                            {getMistriFullFinishedIncludes(fw.floorId)}
                          </p>
                        </div>

                        <NestedChoiceButtons
                          question="Roof Truss Type"
                          options={MISTRI_ASSAM_ROOF_OPTIONS}
                          value={entry.assamRoofType}
                          onChange={(v) =>
                            patchFloorWork(fw.floorId, { assamRoofType: v }, fw.customFloorNumber)
                          }
                        />

                        <NestedChoiceButtons
                          question="Roofing Sheet Material"
                          options={MISTRI_ASSAM_ROOFING_SHEET_OPTIONS}
                          value={entry.assamRoofingSheet}
                          onChange={(v) =>
                            patchFloorWork(
                              fw.floorId,
                              { assamRoofingSheet: v },
                              fw.customFloorNumber,
                            )
                          }
                        />

                        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                          <NestedChoiceButtons
                            question="Do you also want flooring (Tile / Marble / Smooth Cement Finish)?"
                            options={MISTRI_YES_NO_OPTIONS}
                            value={
                              entry.includeFineFlooring === true
                                ? 'yes'
                                : entry.includeFineFlooring === false
                                  ? 'no'
                                  : null
                            }
                            onChange={(v) =>
                              patchFloorWork(
                                fw.floorId,
                                {
                                  includeFineFlooring: v === 'yes',
                                  flooringMaterial:
                                    v === 'yes' ? entry.flooringMaterial : null,
                                },
                                fw.customFloorNumber,
                              )
                            }
                          />
                          {entry.includeFineFlooring === true && (
                            <NestedChoiceButtons
                              question="What flooring material will be used?"
                              options={MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS}
                              value={entry.flooringMaterial}
                              onChange={(v) =>
                                patchFloorWork(
                                  fw.floorId,
                                  { flooringMaterial: v },
                                  fw.customFloorNumber,
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            Foundation depth (ft)
                          </label>
                          <Input
                            type="number"
                            min={0.1}
                            step="0.1"
                            inputMode="decimal"
                            placeholder="e.g. 4"
                            value={entry.foundationDepthFt}
                            onChange={(e) =>
                              patchFloorWork(
                                fw.floorId,
                                { foundationDepthFt: e.target.value },
                                fw.customFloorNumber,
                              )
                            }
                          />
                          <p className={HELPER_TEXT}>
                            Enter the required foundation depth in feet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {MISTRI_RCC_SCOPE_OPTIONS.map((opt) => {
                          const selected = selectedScope === opt.value;
                          const disabled = opt.value === 'wall_plaster_only' && wallBlocked;
                          return (
                            <div key={opt.value} className="space-y-2">
                              <OptionCardButton
                                selected={selected}
                                disabled={disabled}
                                onClick={() =>
                                  setRccScope(fw.floorId, opt.value, fw.customFloorNumber)
                                }
                              >
                                <span className="block">
                                  <span className="block">
                                    Option {opt.optionNumber}: {opt.title}
                                  </span>
                                  <span className="mt-1 block text-[10px] font-medium leading-snug text-muted-foreground normal-case tracking-normal">
                                    {getMistriRccScopeLabel(fw.floorId, opt.value)}
                                  </span>
                                </span>
                              </OptionCardButton>
                              {opt.value === 'wall_plaster_only' && wallBlocked && (
                                <p className="px-1 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                                  {UPPER_FLOOR_WALL_REQUIRES_EXISTING_GF_STRUCTURE}
                                </p>
                              )}
                              {opt.value === 'full_construction' && selected && (
                                <div className="ml-2 space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                  <label className="flex items-start gap-2 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-4 w-4 rounded border-border"
                                      checked={entry.includeFineFlooring === true}
                                      onChange={(e) =>
                                        patchFloorWork(
                                          fw.floorId,
                                          {
                                            includeFineFlooring: e.target.checked,
                                            flooringMaterial: e.target.checked ? 'tile' : null,
                                          },
                                          fw.customFloorNumber,
                                        )
                                      }
                                    />
                                    <span>Include Tile Fitting Work?</span>
                                  </label>
                                </div>
                              )}
                              {opt.value === 'wall_plaster_only' && selected && (
                                <div className="ml-2 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                  <NestedChoiceButtons
                                    question="What type of wall material will be used?"
                                    options={MISTRI_BRICKWORK_MATERIAL_OPTIONS}
                                    value={entry.brickMaterial}
                                    onChange={(v) =>
                                      patchFloorWork(
                                        fw.floorId,
                                        { brickMaterial: v, plasterScope: 'both' },
                                        fw.customFloorNumber,
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
                  {MISTRI_CHOWKHAT_SECTION_LABEL}
                </label>
                <OptionCardButton
                  className="items-start"
                  selected={form.includeDoorWindowFrames}
                  onClick={() => {
                    update('includeDoorWindowFrames', !form.includeDoorWindowFrames);
                    setStep2Error(null);
                  }}
                >
                  <span className="block">{MISTRI_CHOWKHAT_LABEL}</span>
                  <span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-slate-700 dark:text-slate-300">
                    {MISTRI_CHOWKHAT_HINT}
                  </span>
                </OptionCardButton>
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                  <p className={cn(HELPER_TEXT, 'text-amber-800 dark:text-amber-200')}>
                    💡{' '}
                    <span className="font-semibold">Note:</span>{' '}
                    {MISTRI_CHOWKHAT_RATE_NOTE}
                  </p>
                </div>
              </div>

              {showFoundationProvision && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Foundation provision for
                      </p>
                      <p className={HELPER_TEXT}>
                        Enter the number of floors the foundation must support (whole number only).
                        It must be greater than your highest constructing floor
                        {currentUpper != null
                          ? ` — minimum ${minFoundationFloors}`
                          : ''}
                        .
                      </p>
                    </div>
                    <Input
                      label="No. of floors"
                      type="text"
                      inputMode="numeric"
                      placeholder={`e.g. ${minFoundationFloors}`}
                      value={form.futureFloorCustom}
                      onChange={(e) => {
                        update('futureFloorCustom', e.target.value.replace(/\D/g, ''));
                        setStep2Error(null);
                      }}
                    />
                    {futureCustomError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {futureCustomError}
                      </p>
                    )}
                  </div>

                  <p className={cn(HELPER_TEXT, 'border-l-2 border-amber-500/50 pl-2.5')}>
                    * Note: Higher foundation provision needs stronger foundations, thicker columns,
                    and more steel today — this affects labor and material costs.
                  </p>
                </div>
              )}

              {showContractType && (
                <div className="flex flex-col gap-1.5">
                  <label className={SECTION_LABEL}>
                    Contract Type (Supply Scope)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {MISTRI_CONTRACT_TYPE_OPTIONS.map((opt) => (
                      <OptionCardButton
                        key={opt.value}
                        selected={form.contractType === opt.value}
                        onClick={() => {
                          update('contractType', opt.value);
                          setStep2Error(null);
                        }}
                      >
                        {opt.label}
                      </OptionCardButton>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
                  Project Starting Time
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MISTRI_START_TIME_OPTIONS.map((opt) => (
                    <OptionCardButton
                      key={opt.value}
                      selected={form.projectStartTimeType === opt.value}
                      onClick={() => {
                        update('projectStartTimeType', opt.value);
                        if (opt.value !== 'specific') {
                          update('projectStartTimeSpecificDate', '');
                        }
                        setStep2Error(null);
                      }}
                    >
                      {opt.label}
                    </OptionCardButton>
                  ))}
                </div>
                {form.projectStartTimeType === 'specific' && (
                  <Input
                    label="Specific Start Date"
                    type="date"
                    value={form.projectStartTimeSpecificDate}
                    onChange={(e) => {
                      update('projectStartTimeSpecificDate', e.target.value);
                      setStep2Error(null);
                    }}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
                  Additional Requirements <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder=""
                  value={form.additionalRequirements}
                  onChange={(e) => {
                    update('additionalRequirements', e.target.value);
                    setStep2Error(null);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-slate-600 dark:placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={tryGoStep3}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Review & Launch Auction</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Project Title', value: previewTitle },
                  { label: 'District', value: form.location },
                  {
                    label: 'Pincode',
                    value: form.pincode.trim() || 'Not specified',
                  },
                  ...reviewBlocks,
                  {
                    label: 'Bidding Window',
                    value:
                      form.bidding_minutes === '7'
                        ? '7 minutes from launch'
                        : '24 hours from launch',
                  },
                  { label: 'Selection Window', value: '5 minutes after bids close' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs font-medium text-gray-700 dark:text-zinc-300 flex-1 min-w-0">{label}</span>
                    <div className="text-sm font-semibold text-foreground text-right flex-shrink-0 max-w-[55%]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={loading} onClick={handleSubmit}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Launching…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">🚀 Launch Auction</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Auction Launched! 🎉</h2>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Your project <strong className="text-foreground">&quot;{submittedTitle}&quot;</strong> is now live.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep(1);
                    setForm(EMPTY_FORM);
                    setSubmittedTitle('');
                    setStep1ValidationAttempted(false);
                    setStep1Errors({});
                    setStep2Error(null);
                  }}
                >
                  Post Another
                </Button>
                <Button className="flex-1" onClick={() => router.push('/dashboard/owner')}>
                  View Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

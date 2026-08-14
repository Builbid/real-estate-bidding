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
  CUSTOM_FLOOR_NUMBER_INVALID_MESSAGE,
  CUSTOM_FLOOR_PLAN_INVALID_MESSAGE,
  FOUNDATION_CAPACITY_INVALID_MESSAGE,
  MISTRI_BRICKWORK_MATERIAL_OPTIONS,
  MISTRI_CONTRACT_TYPE_OPTIONS,
  MISTRI_CUSTOM_FLOOR_ID,
  MISTRI_FLOORING_MATERIAL_OPTIONS,
  MISTRI_FUTURE_FLOOR_OPTIONS,
  MISTRI_PLASTER_SCOPE_OPTIONS,
  MISTRI_START_TIME_OPTIONS,
  applyMistriFloorWorkSelection,
  currentFloorPlanFromFloorWork,
  floorPlanUpperCount,
  formatMistriFloorWorkLabel,
  getMistriFrameSkeletonIncludes,
  getMistriFullFinishedIncludes,
  getMistriWorkRequirementBlocks,
  isFutureFloorOptionAllowed,
  mistriContractTypeRequiredForFloorWork,
  mistriFoundationProvisionRequired,
  parseCustomFloorNumber,
  resolveFutureFloorPlan,
  sortMistriFloorWork,
  validateMistriFloorWorkInput,
  visibleMistriFloorWorkTypes,
  floorWorkOptionsForFloor,
  type MistriBrickworkMaterial,
  type MistriContractType,
  type MistriFloorId,
  type MistriFloorWork,
  type MistriFloorWorkType,
  type MistriFlooringMaterial,
  type MistriFutureFloorOption,
  type MistriPlasterScope,
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
}

const EMPTY_FLOOR_WORK: FloorWorkForm = {
  workTypes: [],
  brickMaterial: null,
  plasterScope: null,
  flooringMaterial: null,
};

function OptionCardButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
        selected
          ? 'border-emerald-500/70 bg-emerald-500/15 text-gray-900 dark:text-white'
          : 'border-border bg-card text-gray-800 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500',
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

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  buildingTypes: BuildingType[];
  customFloorSelected: boolean;
  customFloorNumber: string;
  floorWorkById: Record<string, FloorWorkForm>;
  approximateArea: string;
  futureFloorOption: MistriFutureFloorOption | null;
  futureFloorCustom: string;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}

const EMPTY_FORM: FormState = {
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  buildingTypes: [],
  customFloorSelected: false,
  customFloorNumber: '',
  floorWorkById: {},
  approximateArea: '',
  futureFloorOption: null,
  futureFloorCustom: '',
  contractType: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
};

function selectedFloorIds(form: FormState): MistriFloorId[] {
  const ids: MistriFloorId[] = [...form.buildingTypes];
  if (form.customFloorSelected) ids.push(MISTRI_CUSTOM_FLOOR_ID);
  return ids;
}

function floorWorkKey(floorId: MistriFloorId): string {
  return floorId;
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
    floors?: string;
    customFloor?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submittedTitle, setSubmittedTitle] = useState('');

  const districtSelection = parseAssamDistrictSelection(form.location);
  const selectedFloors = selectedFloorIds(form);
  const parsedCustomFloor = parseCustomFloorNumber(form.customFloorNumber);

  const assembledFloorWork: MistriFloorWork[] = useMemo(() => {
    return sortMistriFloorWork(
      selectedFloors.map((floorId) => {
        const entry = form.floorWorkById[floorWorkKey(floorId)] ?? EMPTY_FLOOR_WORK;
        return {
          floorId,
          customFloorNumber:
            floorId === MISTRI_CUSTOM_FLOOR_ID ? parsedCustomFloor : null,
          workTypes: entry.workTypes,
          brickMaterial: entry.brickMaterial,
          plasterScope: entry.plasterScope,
          flooringMaterial: entry.flooringMaterial,
        };
      }),
    );
  }, [form.floorWorkById, parsedCustomFloor, selectedFloors]);

  const previewTitle = generateProjectTitle({
    serviceType: 'labour_contractor',
    district: districtSelection?.district ?? form.location,
    floorWork: assembledFloorWork,
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

  function setBuildingTypes(nextTypes: BuildingType[]) {
    setForm((f) => {
      const nextIds = new Set<string>([
        ...nextTypes,
        ...(f.customFloorSelected ? [MISTRI_CUSTOM_FLOOR_ID] : []),
      ]);
      const floorWorkById = { ...f.floorWorkById };
      for (const key of Object.keys(floorWorkById)) {
        if (!nextIds.has(key)) delete floorWorkById[key];
      }
      const droppedGround =
        f.buildingTypes.includes('RCC Ground Floor') &&
        !nextTypes.includes('RCC Ground Floor');
      const droppedAssam =
        f.buildingTypes.includes(ASSAM_BUILDING_TYPE) &&
        !nextTypes.includes(ASSAM_BUILDING_TYPE);
      return {
        ...f,
        buildingTypes: nextTypes,
        floorWorkById,
        ...(droppedGround || droppedAssam
          ? { futureFloorOption: null, futureFloorCustom: '' }
          : {}),
      };
    });
    setStep1Errors((errors) => {
      const next = { ...errors };
      delete next.floors;
      return next;
    });
  }

  function setCustomFloor(selected: boolean, number: string) {
    setForm((f) => {
      const floorWorkById = { ...f.floorWorkById };
      if (!selected) delete floorWorkById[MISTRI_CUSTOM_FLOOR_ID];
      return {
        ...f,
        customFloorSelected: selected,
        customFloorNumber: number,
        floorWorkById,
      };
    });
    setStep1Errors((errors) => {
      const next = { ...errors };
      delete next.floors;
      delete next.customFloor;
      return next;
    });
  }

  function patchFloorWork(floorId: MistriFloorId, patch: Partial<FloorWorkForm>) {
    setForm((f) => {
      const key = floorWorkKey(floorId);
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

  function toggleFloorWorkType(floorId: MistriFloorId, workType: MistriFloorWorkType) {
    setForm((f) => {
      const key = floorWorkKey(floorId);
      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      const workTypes = applyMistriFloorWorkSelection(current.workTypes, workType);
      return {
        ...f,
        floorWorkById: {
          ...f.floorWorkById,
          [key]: {
            workTypes,
            brickMaterial: workTypes.includes('brick_aac') ? current.brickMaterial : null,
            plasterScope: workTypes.includes('plastering') ? current.plasterScope : null,
            flooringMaterial: workTypes.includes('flooring') ? current.flooringMaterial : null,
          },
        },
      };
    });
    setStep2Error(null);
  }

  function mistriValidationInput() {
    return {
      floorWork: assembledFloorWork,
      approximateArea: form.approximateArea,
      futureFloorOption: form.futureFloorOption,
      futureFloorCustom: form.futureFloorCustom,
      contractType: form.contractType,
      projectStartTimeType: form.projectStartTimeType,
      projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
      additionalRequirements: form.additionalRequirements,
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

    if (selectedFloors.length === 0) {
      errors.floors = 'Select Assam Type or at least one RCC floor.';
    }

    if (form.customFloorSelected && parsedCustomFloor == null) {
      errors.customFloor = CUSTOM_FLOOR_NUMBER_INVALID_MESSAGE;
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
      floorWork: validated.details.floorWork,
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
  const showContractType = mistriContractTypeRequiredForFloorWork(assembledFloorWork);
  const currentFloorPlan = currentFloorPlanFromFloorWork(assembledFloorWork);
  const currentUpper = floorPlanUpperCount(currentFloorPlan);

  const futureCustomError = (() => {
    if (!showFoundationProvision || form.futureFloorOption !== 'custom') return null;
    const resolved = resolveFutureFloorPlan(
      'custom',
      form.futureFloorCustom,
      currentFloorPlan,
    );
    return 'error' in resolved ? CUSTOM_FLOOR_PLAN_INVALID_MESSAGE : null;
  })();

  const foundationCapacityError = (() => {
    if (!showFoundationProvision || !form.futureFloorOption) return null;
    const futureResolved = resolveFutureFloorPlan(
      form.futureFloorOption,
      form.futureFloorCustom,
      currentFloorPlan,
    );
    if ('error' in futureResolved) return null;
    const futureN = floorPlanUpperCount(futureResolved.value);
    if (currentUpper == null || futureN == null) return null;
    if (futureN < currentUpper) return FOUNDATION_CAPACITY_INVALID_MESSAGE;
    return null;
  })();

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
                  'bg-secondary text-muted-foreground/80',
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

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
                  Building / Floor Type
                </label>
                <BuildingTypeSelector
                  purpose="mistri"
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
                  Choose the work type for each selected floor. Options that cannot be combined are removed after you pick one.
                </p>
              </div>

              {step2Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              {assembledFloorWork.map((fw) => {
                const key = floorWorkKey(fw.floorId);
                const entry = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
                const visible = visibleMistriFloorWorkTypes(entry.workTypes, fw.floorId);
                const options = floorWorkOptionsForFloor(fw.floorId).filter((opt) =>
                  visible.includes(opt.value),
                );
                const title = formatMistriFloorWorkLabel(fw);

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className={HELPER_TEXT}>
                        Select one work type for this floor. Brick / AAC can be combined with plastering.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {options.map((opt) => {
                        const selected = entry.workTypes.includes(opt.value);
                        return (
                          <div key={opt.value} className="space-y-2">
                            <OptionCardButton
                              selected={selected}
                              onClick={() => toggleFloorWorkType(fw.floorId, opt.value)}
                            >
                              {opt.label}
                            </OptionCardButton>
                            {opt.value === 'full_finished' && selected && (
                              <p className={cn('px-1', HELPER_TEXT)}>
                                {getMistriFullFinishedIncludes(fw.floorId)}
                              </p>
                            )}
                            {opt.value === 'frame_skeleton' && selected && (
                              <p className={cn('px-1', HELPER_TEXT)}>
                                {getMistriFrameSkeletonIncludes(fw.floorId)}
                              </p>
                            )}
                            {opt.value === 'brick_aac' && selected && (
                              <div className="ml-2 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                <NestedChoiceButtons
                                  question="What type of wall material will be used?"
                                  options={MISTRI_BRICKWORK_MATERIAL_OPTIONS}
                                  value={entry.brickMaterial}
                                  onChange={(v) => patchFloorWork(fw.floorId, { brickMaterial: v })}
                                />
                              </div>
                            )}
                            {opt.value === 'plastering' && selected && (
                              <div className="ml-2 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                <NestedChoiceButtons
                                  question="Which plastering do you need?"
                                  options={MISTRI_PLASTER_SCOPE_OPTIONS}
                                  value={entry.plasterScope}
                                  onChange={(v) => patchFloorWork(fw.floorId, { plasterScope: v })}
                                />
                              </div>
                            )}
                            {opt.value === 'flooring' && selected && (
                              <div className="ml-2 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                <NestedChoiceButtons
                                  question="What flooring material will be used?"
                                  options={MISTRI_FLOORING_MATERIAL_OPTIONS}
                                  value={entry.flooringMaterial}
                                  onChange={(v) =>
                                    patchFloorWork(fw.floorId, { flooringMaterial: v })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {showFoundationProvision && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        What is your future expansion plan for the foundation?
                      </p>
                      <p className={HELPER_TEXT}>
                        Select the total floor capacity the foundation and columns must be engineered
                        to support for future building additions.
                      </p>
                    </div>
                    <Select
                      value={form.futureFloorOption ?? undefined}
                      onValueChange={(v) => {
                        update('futureFloorOption', v as MistriFutureFloorOption);
                        if (v !== 'custom') update('futureFloorCustom', '');
                        setStep2Error(null);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select future foundation capacity" />
                      </SelectTrigger>
                      <SelectContent>
                        {MISTRI_FUTURE_FLOOR_OPTIONS.map((opt) => {
                          const allowed = isFutureFloorOptionAllowed(opt.value, currentUpper);
                          return (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              disabled={!allowed}
                            >
                              {opt.label}
                              {!allowed ? ' (below current build)' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {form.futureFloorOption === 'custom' && (
                      <div className="space-y-1">
                        <Input
                          label="Enter total upper floors (e.g. 6, 7, 8)"
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 6 or 7 or 8+"
                          value={form.futureFloorCustom}
                          onChange={(e) => {
                            update(
                              'futureFloorCustom',
                              e.target.value.replace(/[^\d+]/g, ''),
                            );
                            setStep2Error(null);
                          }}
                          className="mt-1"
                        />
                        {futureCustomError && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {futureCustomError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {foundationCapacityError && (
                    <p className="text-xs text-destructive flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {foundationCapacityError}
                    </p>
                  )}

                  <p className={cn(HELPER_TEXT, 'border-l-2 border-amber-500/50 pl-2.5')}>
                    * Note: Designing for higher future floor capacity requires stronger foundations,
                    thicker columns, and more steel reinforcement today, directly affecting labor and
                    material costs.
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

              <Input
                label="Approximate Project Area (Sq. Ft.)"
                type="text"
                inputMode="decimal"
                placeholder="e.g. Approx. 1200 Sq. Ft."
                value={form.approximateArea}
                onChange={(e) => {
                  update('approximateArea', e.target.value);
                  setStep2Error(null);
                }}
              />

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
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
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

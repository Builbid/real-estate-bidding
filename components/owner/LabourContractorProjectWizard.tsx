'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import {
  CUSTOM_FLOOR_PLAN_INVALID_MESSAGE,
  FOUNDATION_CAPACITY_INVALID_MESSAGE,
  MISTRI_CIVIL_WORK_OPTIONS,
  MISTRI_CONTRACT_TYPE_OPTIONS,
  MISTRI_CURRENT_FLOOR_OPTIONS,
  MISTRI_FULL_STRUCTURE_NOTE,
  MISTRI_FUTURE_FLOOR_OPTIONS,
  MISTRI_PLASTER_SIDE_OPTIONS,
  MISTRI_START_TIME_OPTIONS,
  MISTRI_STRUCTURAL_CIVIL_WORK,
  floorPlanUpperCount,
  getMistriWorkRequirementBlocks,
  isFutureFloorOptionAllowed,
  mistriFloorLevelRequired,
  normalizeFloorPlanValue,
  resolveCurrentFloorPlan,
  resolveFutureFloorPlan,
  toggleMistriCivilWorkType,
  validateMistriDetailsInput,
  type MistriCivilWorkType,
  type MistriContractType,
  type MistriCurrentFloorOption,
  type MistriFutureFloorOption,
  type MistriPlasterSide,
  type MistriStartTimeType,
} from '@/lib/mistriDetails';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3 | 4;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = [
  'Project Info',
  'Work Requirements',
  'Review & Launch',
] as const;

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  civilWorkTypes: MistriCivilWorkType[];
  plasterSide: MistriPlasterSide | null;
  approximateArea: string;
  currentFloorOption: MistriCurrentFloorOption | null;
  currentFloorCustom: string;
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
  civilWorkTypes: [],
  plasterSide: null,
  approximateArea: '',
  currentFloorOption: null,
  currentFloorCustom: '',
  futureFloorOption: null,
  futureFloorCustom: '',
  contractType: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
};

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
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submittedTitle, setSubmittedTitle] = useState('');

  const districtSelection = parseAssamDistrictSelection(form.location);
  const previewTitle = generateProjectTitle({
    serviceType: 'labour_contractor',
    district: districtSelection?.district ?? form.location,
    civilWorkTypes: form.civilWorkTypes,
    plasterSide: form.plasterSide,
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

  function toggleCivilWork(value: MistriCivilWorkType) {
    setForm((f) => {
      const nextTypes = toggleMistriCivilWorkType(f.civilWorkTypes, value);
      const floorStillRequired = mistriFloorLevelRequired(nextTypes);
      return {
        ...f,
        civilWorkTypes: nextTypes,
        plasterSide: nextTypes.includes('plastering') ? f.plasterSide : null,
        ...(floorStillRequired
          ? {}
          : {
              currentFloorOption: null,
              currentFloorCustom: '',
              futureFloorOption: null,
              futureFloorCustom: '',
            }),
      };
    });
    // Clears floor (and any other) step-2 validation error when structural options change.
    setStep2Error(null);
  }

  function mistriValidationInput() {
    return {
      civilWorkTypes: form.civilWorkTypes,
      plasterSide: form.plasterSide,
      approximateArea: form.approximateArea,
      currentFloorOption: form.currentFloorOption,
      currentFloorCustom: form.currentFloorCustom,
      futureFloorOption: form.futureFloorOption,
      futureFloorCustom: form.futureFloorCustom,
      contractType: form.contractType,
      projectStartTimeType: form.projectStartTimeType,
      projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
      additionalRequirements: form.additionalRequirements,
    };
  }

  function customFloorInlineError(
    option: 'custom' | string | null,
    customValue: string,
  ): string | null {
    if (option !== 'custom') return null;
    if (!customValue.trim() || !normalizeFloorPlanValue(customValue)) {
      return CUSTOM_FLOOR_PLAN_INVALID_MESSAGE;
    }
    return null;
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
    const validated = validateMistriDetailsInput(mistriValidationInput());
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

    const validated = validateMistriDetailsInput(mistriValidationInput());
    if ('error' in validated) {
      setError(validated.error);
      setLoading(false);
      return;
    }

    const autoTitle = generateProjectTitle({
      serviceType: 'labour_contractor',
      district: districtSelection.district,
      civilWorkTypes: form.civilWorkTypes,
      plasterSide: form.plasterSide,
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
    const validated = validateMistriDetailsInput(mistriValidationInput());
    return 'details' in validated ? getMistriWorkRequirementBlocks(validated.details) : [];
  })();

  const floorLevelRequired = mistriFloorLevelRequired(form.civilWorkTypes);
  const currentCustomError = floorLevelRequired
    ? customFloorInlineError(form.currentFloorOption, form.currentFloorCustom)
    : null;
  const futureCustomError = floorLevelRequired
    ? customFloorInlineError(form.futureFloorOption, form.futureFloorCustom)
    : null;

  const resolvedCurrentPlan = (() => {
    const resolved = resolveCurrentFloorPlan(
      form.currentFloorOption,
      form.currentFloorCustom,
    );
    return 'value' in resolved ? resolved.value : null;
  })();
  const currentUpper = floorPlanUpperCount(resolvedCurrentPlan);

  const foundationCapacityError = (() => {
    if (!form.currentFloorOption || !form.futureFloorOption || !resolvedCurrentPlan) {
      return null;
    }
    const futureResolved = resolveFutureFloorPlan(
      form.futureFloorOption,
      form.futureFloorCustom,
      resolvedCurrentPlan,
    );
    if ('error' in futureResolved) return null;
    const futureN = floorPlanUpperCount(futureResolved.value);
    if (currentUpper == null || futureN == null || futureN >= currentUpper) return null;
    return FOUNDATION_CAPACITY_INVALID_MESSAGE;
  })();

  function selectCurrentFloorOption(option: MistriCurrentFloorOption) {
    if (!floorLevelRequired) return;
    setForm((f) => {
      const nextCurrentCustom = option === 'custom' ? f.currentFloorCustom : '';
      const resolved = resolveCurrentFloorPlan(option, nextCurrentCustom);
      const nextUpper =
        'value' in resolved ? floorPlanUpperCount(resolved.value) : null;
      const futureStillOk =
        f.futureFloorOption == null ||
        isFutureFloorOptionAllowed(f.futureFloorOption, nextUpper);
      return {
        ...f,
        currentFloorOption: option,
        currentFloorCustom: nextCurrentCustom,
        ...(futureStillOk
          ? {}
          : {
              futureFloorOption: null,
              futureFloorCustom: '',
            }),
      };
    });
    setStep2Error(null);
  }

  function selectFutureFloorOption(option: MistriFutureFloorOption) {
    if (!floorLevelRequired) return;
    if (!isFutureFloorOptionAllowed(option, currentUpper)) return;
    update('futureFloorOption', option);
    if (option !== 'custom') update('futureFloorCustom', '');
    setStep2Error(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Post Mistri Contractor Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Specify civil work scope clearly so mistri contractors can bid without disputes.
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
                  i + 1 === step ? 'text-foreground font-semibold' : 'text-muted-foreground',
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                <p className="text-[11px] text-indigo-400/60">
                  After bidding closes you have 5 minutes to select a mistri contractor.
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
                <h2 className="text-base font-semibold text-foreground">Civil Work Requirements</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Select all work types that apply so bids match the real scope on site.
                </p>
              </div>

              {step2Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-1 gap-2">
                  {MISTRI_CIVIL_WORK_OPTIONS.map((opt) => {
                    const selected = form.civilWorkTypes.includes(opt.value);
                    const fullStructureSelected = form.civilWorkTypes.includes(
                      'complete_full_structure',
                    );
                    const disabledByFullStructure =
                      fullStructureSelected &&
                      (MISTRI_STRUCTURAL_CIVIL_WORK as readonly string[]).includes(opt.value);
                    return (
                      <div key={opt.value} className="space-y-2">
                        <button
                          type="button"
                          disabled={disabledByFullStructure}
                          aria-disabled={disabledByFullStructure}
                          onClick={() => {
                            if (disabledByFullStructure) return;
                            toggleCivilWork(opt.value);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                            selected
                              ? 'border-emerald-500/70 bg-emerald-500/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40',
                            disabledByFullStructure &&
                              'cursor-not-allowed opacity-45 hover:border-border',
                          )}
                        >
                          <span>{opt.label}</span>
                          {selected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        </button>
                        {opt.value === 'complete_full_structure' && (
                          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                            {MISTRI_FULL_STRUCTURE_NOTE}
                          </p>
                        )}
                        {opt.value === 'plastering' && selected && (
                          <div className="ml-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                            {MISTRI_PLASTER_SIDE_OPTIONS.map((side) => {
                              const sideSelected = form.plasterSide === side.value;
                              return (
                                <button
                                  key={side.value}
                                  type="button"
                                  onClick={() => {
                                    update('plasterSide', side.value);
                                    setStep2Error(null);
                                  }}
                                  className={cn(
                                    'rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors',
                                    sideSelected
                                      ? 'border-emerald-500/70 bg-emerald-500/15 text-foreground'
                                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40',
                                  )}
                                >
                                  {side.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Approximate Project Area (Sq. Ft.)"
                type="text"
                inputMode="decimal"
                placeholder="e.g. Approx. 1200 Sq. Ft. (Rough estimate is fine)"
                value={form.approximateArea}
                onChange={(e) => {
                  update('approximateArea', e.target.value);
                  setStep2Error(null);
                }}
              />

              <div
                className={cn(
                  'flex flex-col gap-3 transition-opacity',
                  !floorLevelRequired && 'opacity-50 pointer-events-none select-none',
                )}
                aria-disabled={!floorLevelRequired}
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Structural Floor Planning
                  </label>
                  {!floorLevelRequired && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Applies only when Foundation &amp; Concrete Structure or Complete Full
                      Structure is selected.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      How many floors do you plan to build in this current project?
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Select the exact number of floors to be constructed now under this bid.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MISTRI_CURRENT_FLOOR_OPTIONS.map((opt) => {
                      const selected = form.currentFloorOption === opt.value;
                      return (
                        <button
                          key={`current-${opt.value}`}
                          type="button"
                          disabled={!floorLevelRequired}
                          onClick={() => selectCurrentFloorOption(opt.value)}
                          className={cn(
                            'rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                            selected
                              ? 'border-emerald-500/70 bg-emerald-500/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40',
                            !floorLevelRequired && 'cursor-not-allowed hover:border-border',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {form.currentFloorOption === 'custom' && floorLevelRequired && (
                    <div className="space-y-1">
                      <Input
                        label="Enter floor plan (e.g. G+3, G+4)"
                        type="text"
                        inputMode="text"
                        placeholder="e.g. G+3 or G+4"
                        value={form.currentFloorCustom}
                        onChange={(e) => {
                          const nextCustom = e.target.value;
                          setForm((f) => {
                            const resolved = resolveCurrentFloorPlan('custom', nextCustom);
                            const nextUpper =
                              'value' in resolved
                                ? floorPlanUpperCount(resolved.value)
                                : null;
                            const futureStillOk =
                              f.futureFloorOption == null ||
                              isFutureFloorOptionAllowed(f.futureFloorOption, nextUpper);
                            return {
                              ...f,
                              currentFloorCustom: nextCustom,
                              ...(futureStillOk
                                ? {}
                                : {
                                    futureFloorOption: null,
                                    futureFloorCustom: '',
                                  }),
                            };
                          });
                          setStep2Error(null);
                        }}
                        className="mt-1"
                      />
                      {currentCustomError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {currentCustomError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      What is your future expansion plan for the foundation?
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Select the total floor capacity the foundation and columns must be engineered
                      to support for future building additions.
                    </p>
                  </div>
                  <Select
                    value={form.futureFloorOption ?? undefined}
                    onValueChange={(v) =>
                      selectFutureFloorOption(v as MistriFutureFloorOption)
                    }
                    disabled={!floorLevelRequired}
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
                  {form.futureFloorOption === 'custom' && floorLevelRequired && (
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

                {floorLevelRequired && foundationCapacityError && (
                  <p className="text-xs text-destructive flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {foundationCapacityError}
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-amber-500/50 pl-2.5">
                  * Note: Designing for higher future floor capacity requires stronger foundations,
                  thicker columns, and more steel reinforcement today, directly affecting labor and
                  material costs.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contract Type (Supply Scope)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {MISTRI_CONTRACT_TYPE_OPTIONS.map((opt) => {
                    const selected = form.contractType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          update('contractType', opt.value);
                          setStep2Error(null);
                        }}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                          selected
                            ? 'border-emerald-500/70 bg-emerald-500/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40',
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Project Starting Time
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MISTRI_START_TIME_OPTIONS.map((opt) => {
                    const selected = form.projectStartTimeType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          update('projectStartTimeType', opt.value);
                          if (opt.value !== 'specific') {
                            update('projectStartTimeSpecificDate', '');
                          }
                          setStep2Error(null);
                        }}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                          selected
                            ? 'border-emerald-500/70 bg-emerald-500/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40',
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Additional Requirements <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify custom details (e.g., concrete grade M20/M25, site access constraints, dismantling work required, scaffolding details)..."
                  value={form.additionalRequirements}
                  onChange={(e) => {
                    update('additionalRequirements', e.target.value);
                    setStep2Error(null);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
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
                    <span className="text-xs text-muted-foreground flex-1 min-w-0">{label}</span>
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
                <p className="text-sm text-muted-foreground">
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

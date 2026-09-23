'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { StartTimeAndNotes, WIZARD_SECTION_LABEL, WizardAccentLabels, withSectionColon } from '@/components/owner/wizard/StartTimeAndNotes';
import { FORM_CONTINUE_BTN, FORM_SECTION_CARD, FORM_SHELL_CARD } from '@/components/owner/wizard/formTheme';
import { FieldError, useScrollToFirstInvalid } from '@/components/owner/wizard/fieldValidation';
import { ReviewSummaryList, WizardStepper } from '@/components/owner/wizard/ReviewSummary';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import { parseCustomFloorSequence } from '@/lib/mistriDetails';
import type { BuildingType } from '@/lib/buildingConfig';
import {
  DRAWING_DELIVERABLE_OPTIONS,
  DRAWING_HOUSE_STRUCTURE_OPTIONS,
  DRAWING_PACKAGE_OPTIONS,
  drawingTypesFromPackages,
  getDrawingWorkRequirementBlocks,
  resolveDrawingBuildingTypes,
  validateDrawingDetailsInput,
  type DrawingDeliverable,
  type DrawingDesignPackage,
  type DrawingHouseStructure,
  type ProjectStartTimeType,
} from '@/lib/drawingDesign';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3;

const BIDDING_MINUTES = 7;
const PROGRESS_LABELS = ['Project Info', 'Work Requirements', 'Review & Launch'] as const;

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  houseStructure: DrawingHouseStructure | null;
  buildingTypes: BuildingType[];
  customFloorSelected: boolean;
  customFloors: number[];
  packages: DrawingDesignPackage[];
  plotDimensions: string;
  deliverables: DrawingDeliverable[];
  projectStartTimeType: ProjectStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}

const EMPTY_FORM: FormState = {
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  houseStructure: null,
  buildingTypes: [],
  customFloorSelected: false,
  customFloors: [],
  packages: [],
  plotDimensions: '',
  deliverables: [],
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
};

export function DrawingDesignProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step2FieldErrors, setStep2FieldErrors] = useState<Record<string, string>>({});
  function clearStep2() {
    setStep2Error(null);
    setStep2FieldErrors({});
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [invalidScrollToken, setInvalidScrollToken] = useState(0);
  useScrollToFirstInvalid(invalidScrollToken);
  function revealInvalid() {
    setInvalidScrollToken((token) => token + 1);
  }
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    pincode?: string;
    houseStructure?: string;
    floors?: string;
    customFloor?: string;
    bidding?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (
      step1ValidationAttempted &&
      (key === 'location' ||
        key === 'pincode' ||
        key === 'houseStructure' ||
        key === 'buildingTypes' ||
        key === 'customFloorSelected' ||
        key === 'customFloors')
    ) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'location') delete next.location;
        if (key === 'pincode') delete next.pincode;
        if (key === 'houseStructure') delete next.houseStructure;
        if (key === 'buildingTypes' || key === 'customFloorSelected') delete next.floors;
        if (key === 'customFloors' || key === 'customFloorSelected') delete next.customFloor;
        return next;
      });
    }
  }

  function validatedDetails() {
    return validateDrawingDetailsInput({
      packages: form.packages,
      houseStructure: form.houseStructure,
      buildingTypes: form.buildingTypes,
      customFloorSelected: form.customFloorSelected,
      customFloors: form.customFloors,
      plotDimensions: form.plotDimensions,
      deliverables: form.deliverables,
      projectStartTimeType: form.projectStartTimeType,
      projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
      additionalRequirements: form.additionalRequirements,
    });
  }

  function tryGoStep2() {
    const errors: typeof step1Errors = {};
    if (!parseAssamDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the list.';
    }
    const pincodeError = validatePincode(form.pincode, { required: true });
    if (pincodeError) errors.pincode = pincodeError;
    if (form.bidding_minutes !== '7' && form.bidding_minutes !== '1440') {
      errors.bidding = 'Select a bidding duration.';
    }
    if (!form.houseStructure) {
      errors.houseStructure = 'Select Assam Type or RCC Structure.';
    } else if (form.houseStructure === 'rcc') {
      if (form.buildingTypes.length === 0 && !form.customFloorSelected) {
        errors.floors = 'Select at least one target work floor.';
      }
      if (form.customFloorSelected) {
        const sequence = parseCustomFloorSequence(form.customFloors, { allowGaps: true });
        if (!sequence) {
          errors.customFloor = 'Add at least one floor number above 4th.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setStep1ValidationAttempted(true);
      setStep1Errors(errors);
      revealInvalid();
      return;
    }
    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep(2);
  }

  function tryGoStep3() {
    const validated = validatedDetails();
    if ('error' in validated) {
      setStep2Error(validated.error);
      setStep2FieldErrors(validated.fieldErrors);
      revealInvalid();
      return;
    }
    clearStep2();
    setStep(3);
  }

  async function handleSubmit() {
    const validated = validatedDetails();
    if ('error' in validated) {
      setError(validated.error);
      revealInvalid();
      return;
    }
    setLoading(true);
    setError(null);

    const districtSelection = parseAssamDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the list.');
      setLoading(false);
      revealInvalid();
      return;
    }

    if (hasContactInfo(form.additionalRequirements)) {
      setError('Remove contact details from additional requirements before submitting.');
      setLoading(false);
      revealInvalid();
      return;
    }

    const autoTitle = generateProjectTitle({
      serviceType: 'drawing_design',
      district: districtSelection.district,
    });

    const result = await createProjectAction({
      service_type: 'drawing_design',
      title: autoTitle,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10) || BIDDING_MINUTES,
      building_types: resolveDrawingBuildingTypes({
        houseStructure: form.houseStructure,
        buildingTypes: form.buildingTypes,
      }),
      drawing_types: drawingTypesFromPackages(validated.details.packages),
      drawing_details: validated.details,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      revealInvalid();
      return;
    }
    router.push('/dashboard/owner');
  }

  const districtSelection = parseAssamDistrictSelection(form.location);
  const previewTitle = generateProjectTitle({
    serviceType: 'drawing_design',
    district: districtSelection?.district ?? form.location,
  });
  const reviewDetails = validatedDetails();
  const reviewBlocks =
    'error' in reviewDetails ? [] : getDrawingWorkRequirementBlocks(reviewDetails.details);

  return (
    <WizardAccentLabels>
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <HistoryBackButton className="mb-2" />
        <h1 className="text-xl font-bold text-foreground">Post Drawing and Design Project</h1>
      </div>

      <WizardStepper labels={PROGRESS_LABELS} step={step} />

      <Card className={FORM_SHELL_CARD}>
        <CardContent className="space-y-4 pt-6 pb-6">
          {error && (
            <div
              className="mb-1 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400"
              data-field-invalid="true"
              data-validation-banner="true"
              tabIndex={-1}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Project Information</h2>

              <AssamDistrictAutocomplete
                value={form.location}
                onChange={(v) => update('location', v)}
                error={step1ValidationAttempted ? step1Errors.location : undefined}
              />
              <Input
                label="Pincode"
                type="text"
                inputMode="numeric"
                placeholder=""
                value={form.pincode}
                onChange={(e) => update('pincode', formatPincodeInput(e.target.value))}
                error={step1ValidationAttempted ? step1Errors.pincode : undefined}
              />

              <div
                className={cn(
                  FORM_SECTION_CARD,
                  step1ValidationAttempted && step1Errors.houseStructure && 'ring-1 ring-red-500',
                )}
                data-field-invalid={step1ValidationAttempted && step1Errors.houseStructure ? 'true' : undefined}
              >
                <label className={WIZARD_SECTION_LABEL}>
                  {withSectionColon('Structure Type')}
                </label>
                <OptionSelectGrid
                  options={DRAWING_HOUSE_STRUCTURE_OPTIONS}
                  value={form.houseStructure}
                  onSelect={(value) => {
                    setForm((current) => ({
                      ...current,
                      houseStructure: value,
                      buildingTypes: value === 'assam' ? [] : current.buildingTypes,
                      customFloorSelected: value === 'assam' ? false : current.customFloorSelected,
                      customFloors: value === 'assam' ? [] : current.customFloors,
                    }));
                    if (step1ValidationAttempted) {
                      setStep1Errors((errors) => {
                        const next = { ...errors };
                        delete next.houseStructure;
                        if (value === 'assam') {
                          delete next.floors;
                          delete next.customFloor;
                        }
                        return next;
                      });
                    }
                  }}
                  columns={2}
                />
                <FieldError message={step1ValidationAttempted ? step1Errors.houseStructure : undefined} />
              </div>

              {form.houseStructure === 'rcc' && (
                <div className={FORM_SECTION_CARD}>
                  <label className={WIZARD_SECTION_LABEL}>
                    {withSectionColon('Target Work Floor')}
                  </label>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                    Select the specific floor(s) where work will be executed for this project.
                  </p>
                  <BuildingTypeSelector
                    purpose="drawing"
                    rccOnly
                    allowNonSequentialFloors
                    value={form.buildingTypes}
                    onChange={(types) => update('buildingTypes', types)}
                    showCustomFloor
                    customSelected={form.customFloorSelected}
                    customFloors={form.customFloors}
                    onCustomChange={(selected, floors) => {
                      setForm((current) => ({
                        ...current,
                        customFloorSelected: selected,
                        customFloors: floors,
                      }));
                      if (step1ValidationAttempted) {
                        setStep1Errors((errors) => {
                          const next = { ...errors };
                          delete next.floors;
                          delete next.customFloor;
                          return next;
                        });
                      }
                    }}
                    error={step1ValidationAttempted ? step1Errors.floors ?? null : null}
                    customError={step1ValidationAttempted ? step1Errors.customFloor ?? null : null}
                  />
                </div>
              )}

              <div
                className="flex flex-col gap-1.5"
                data-field-invalid={step1ValidationAttempted && step1Errors.bidding ? 'true' : undefined}
              >
                <label className={WIZARD_SECTION_LABEL}>
                  {withSectionColon('Bidding Duration')}
                </label>
                <Select value={form.bidding_minutes} onValueChange={(v) => update('bidding_minutes', v)}>
                  <SelectTrigger className={step1ValidationAttempted && step1Errors.bidding ? 'border-red-500 ring-1 ring-red-500' : undefined}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Minutes (Quick)</SelectItem>
                    <SelectItem value="1440">24 Hours (Standard)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={step1ValidationAttempted ? step1Errors.bidding : undefined} />
              </div>

              <Button size="lg" className={cn('w-full', FORM_CONTINUE_BTN)} onClick={tryGoStep2}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Work Requirements</h2>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Select the drawing packages, building details, and deliverables you need.
                </p>
              </div>

              {step2Error && (
                <div
                  className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400"
                  data-field-invalid="true"
                  data-validation-banner="true"
                  tabIndex={-1}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              <div
                className={cn(FORM_SECTION_CARD, step2FieldErrors.package && 'ring-1 ring-red-500')}
                data-field-invalid={step2FieldErrors.package ? 'true' : undefined}
              >
                <label className={WIZARD_SECTION_LABEL}>{withSectionColon('Package Selection')}</label>
                <OptionSelectGrid
                  options={DRAWING_PACKAGE_OPTIONS}
                  values={form.packages}
                  onToggle={(value) => {
                    update(
                      'packages',
                      form.packages.includes(value)
                        ? form.packages.filter((pkg) => pkg !== value)
                        : [...form.packages, value],
                    );
                    clearStep2();
                  }}
                />
                <FieldError message={step2FieldErrors.package} />
              </div>

              <div
                className={cn(FORM_SECTION_CARD, step2FieldErrors.plot && 'ring-1 ring-red-500')}
                data-field-invalid={step2FieldErrors.plot ? 'true' : undefined}
              >
                <label className={WIZARD_SECTION_LABEL}>
                  {withSectionColon('Approximate Plot Dimensions')}
                </label>
                <Input
                  type="text"
                  value={form.plotDimensions}
                  error={step2FieldErrors.plot}
                  onChange={(e) => {
                    update('plotDimensions', e.target.value);
                    clearStep2();
                  }}
                />
              </div>

              <div
                className={cn(FORM_SECTION_CARD, step2FieldErrors.deliverable && 'ring-1 ring-red-500')}
                data-field-invalid={step2FieldErrors.deliverable ? 'true' : undefined}
              >
                <label className={WIZARD_SECTION_LABEL}>{withSectionColon('Deliverables Required')}</label>
                <OptionSelectGrid
                  options={DRAWING_DELIVERABLE_OPTIONS}
                  values={form.deliverables}
                  onToggle={(value) => {
                    update(
                      'deliverables',
                      form.deliverables.includes(value)
                        ? form.deliverables.filter((d) => d !== value)
                        : [...form.deliverables, value],
                    );
                    clearStep2();
                  }}
                />
                <FieldError message={step2FieldErrors.deliverable} />
              </div>

              <StartTimeAndNotes
                title="Delivery Timeline"
                error={step2FieldErrors.date || step2FieldErrors.start || null}
                startTimeType={form.projectStartTimeType}
                specificDate={form.projectStartTimeSpecificDate}
                additionalRequirements={form.additionalRequirements}
                onStartTimeChange={(v) => {
                  update('projectStartTimeType', v);
                  if (v !== 'specific') update('projectStartTimeSpecificDate', '');
                  clearStep2();
                }}
                onSpecificDateChange={(v) => {
                  update('projectStartTimeSpecificDate', v);
                  clearStep2();
                }}
                onNotesChange={(v) => {
                  update('additionalRequirements', v);
                  clearStep2();
                }}
              />

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button size="lg" className={cn('flex-1', FORM_CONTINUE_BTN)} onClick={tryGoStep3}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Review & Launch</h2>
              <ReviewSummaryList
                items={[
                  { label: 'Service', value: 'Drawing and Design' },
                  { label: 'Project title', value: previewTitle },
                  { label: 'District', value: form.location },
                  { label: 'Pincode', value: form.pincode.trim() || 'Not specified' },
                  ...reviewBlocks,
                  {
                    label: 'Bidding window',
                    value:
                      form.bidding_minutes === '7'
                        ? '7 minutes from launch'
                        : '24 hours from launch',
                  },
                ]}
              />

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button size="lg" className={cn('flex-1', FORM_CONTINUE_BTN)} disabled={loading} onClick={handleSubmit}>
                  {loading ? 'Launching…' : 'Launch Auction'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </WizardAccentLabels>
  );
}

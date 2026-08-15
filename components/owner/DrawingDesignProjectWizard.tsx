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
import { StartTimeAndNotes, WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import {
  DRAWING_DELIVERABLE_OPTIONS,
  DRAWING_FLOOR_OPTIONS,
  DRAWING_PACKAGE_OPTIONS,
  DRAWING_PACKAGE_TO_TYPES,
  buildingTypesFromDrawingFloors,
  getDrawingWorkRequirementBlocks,
  validateDrawingDetailsInput,
  type DrawingDeliverable,
  type DrawingDesignPackage,
  type DrawingFloorPlan,
  type ProjectStartTimeType,
} from '@/lib/drawingDesign';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3;

const BIDDING_MINUTES = 7;
const PROGRESS_LABELS = ['Project Info', 'Work Requirements', 'Review & Launch'] as const;

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  package: DrawingDesignPackage | null;
  floorOption: DrawingFloorPlan | null;
  customFloors: string;
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
  package: null,
  floorOption: null,
  customFloors: '',
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    pincode?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

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

  function validatedDetails() {
    return validateDrawingDetailsInput({
      package: form.package,
      floorOption: form.floorOption,
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
    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) errors.pincode = pincodeError;

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
    const validated = validatedDetails();
    if ('error' in validated) {
      setStep2Error(validated.error);
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    const validated = validatedDetails();
    if ('error' in validated) {
      setError(validated.error);
      return;
    }
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

    const autoTitle = generateProjectTitle({
      serviceType: 'drawing_design',
      district: districtSelection.district,
      buildingTypes: buildingTypesFromDrawingFloors(validated.details.numberOfFloors),
      scopeLabel: DRAWING_PACKAGE_OPTIONS.find((o) => o.value === validated.details.package)?.label,
    });

    const result = await createProjectAction({
      service_type: 'drawing_design',
      title: autoTitle,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10) || BIDDING_MINUTES,
      building_types: buildingTypesFromDrawingFloors(validated.details.numberOfFloors),
      drawing_types: DRAWING_PACKAGE_TO_TYPES[validated.details.package],
      drawing_details: validated.details,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push('/dashboard/owner');
  }

  const districtSelection = parseAssamDistrictSelection(form.location);
  const previewTitle = generateProjectTitle({
    serviceType: 'drawing_design',
    district: districtSelection?.district ?? form.location,
    scopeLabel: form.package
      ? DRAWING_PACKAGE_OPTIONS.find((o) => o.value === form.package)?.label
      : null,
  });
  const reviewDetails = validatedDetails();
  const reviewBlocks =
    'error' in reviewDetails ? [] : getDrawingWorkRequirementBlocks(reviewDetails.details);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>✏️</span> Post Drawing and Design Project
        </h1>
        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-1">
          Choose a drawing package and building details so designers can bid without scope conflicts.
        </p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PROGRESS_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className={cn(
                'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                i + 1 < step
                  ? 'bg-emerald-500 text-white'
                  : i + 1 === step
                    ? 'border-2 border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-secondary text-muted-foreground/80',
              )}
            >
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'truncate text-[10px] sm:text-xs',
                i + 1 === step ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-zinc-400',
              )}
            >
              {label}
            </span>
            {i < PROGRESS_LABELS.length - 1 && (
              <div className="mx-1 h-px min-w-[8px] flex-1 bg-secondary" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6 pb-6">
          {error && (
            <div className="mb-1 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400">
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
                placeholder="e.g. 781001"
                value={form.pincode}
                onChange={(e) => update('pincode', formatPincodeInput(e.target.value))}
                error={step1ValidationAttempted ? step1Errors.pincode : undefined}
              />
              <div className="flex flex-col gap-1.5">
                <label className={WIZARD_SECTION_LABEL}>
                  Bidding Duration
                </label>
                <Select value={form.bidding_minutes} onValueChange={(v) => update('bidding_minutes', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Minutes (Quick)</SelectItem>
                    <SelectItem value="1440">24 Hours (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Work Requirements</h2>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Select the drawing package, building details, and deliverables you need.
                </p>
              </div>

              {step2Error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={WIZARD_SECTION_LABEL}>Package Selection</label>
                <OptionSelectGrid
                  options={DRAWING_PACKAGE_OPTIONS}
                  value={form.package}
                  onSelect={(v) => {
                    update('package', v);
                    setStep2Error(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={WIZARD_SECTION_LABEL}>Number of Floors</label>
                <OptionSelectGrid
                  options={DRAWING_FLOOR_OPTIONS}
                  value={form.floorOption}
                  onSelect={(v) => {
                    update('floorOption', v);
                    if (v !== 'custom') update('customFloors', '');
                    setStep2Error(null);
                  }}
                  columns={2}
                />
                {form.floorOption === 'custom' && (
                  <Input
                    label="Custom Floors"
                    type="text"
                    placeholder="e.g. G+5"
                    value={form.customFloors}
                    onChange={(e) => {
                      update('customFloors', e.target.value);
                      setStep2Error(null);
                    }}
                  />
                )}
              </div>

              <Input
                label="Plot Dimensions (e.g. 30ft x 40ft)"
                type="text"
                placeholder="e.g. 30ft x 40ft"
                value={form.plotDimensions}
                onChange={(e) => {
                  update('plotDimensions', e.target.value);
                  setStep2Error(null);
                }}
              />

              <div className="flex flex-col gap-1.5">
                <label className={WIZARD_SECTION_LABEL}>Deliverables Required</label>
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
                    setStep2Error(null);
                  }}
                />
              </div>

              <StartTimeAndNotes
                startTimeType={form.projectStartTimeType}
                specificDate={form.projectStartTimeSpecificDate}
                additionalRequirements={form.additionalRequirements}
                onStartTimeChange={(v) => {
                  update('projectStartTimeType', v);
                  if (v !== 'specific') update('projectStartTimeSpecificDate', '');
                  setStep2Error(null);
                }}
                onSpecificDateChange={(v) => {
                  update('projectStartTimeSpecificDate', v);
                  setStep2Error(null);
                }}
                onNotesChange={(v) => {
                  update('additionalRequirements', v);
                  setStep2Error(null);
                }}
                notesPlaceholder="Specify site constraints, municipal notes, or extra drawing sheets..."
              />

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={tryGoStep3}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Review & Launch</h2>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 divide-y divide-border/50">
                {[
                  { label: 'Service', value: '✏️ Drawing and Design' },
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
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-zinc-400 flex-shrink-0">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={loading} onClick={handleSubmit}>
                  {loading ? 'Launching…' : '🚀 Launch Auction'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

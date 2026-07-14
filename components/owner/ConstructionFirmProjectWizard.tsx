'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import { ConstructionTypeSelector } from '@/components/construction/ConstructionTypeSelector';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { FinishingLevelSelector } from '@/components/owner/FinishingLevelSelector';
import { DrawingUploadStep, type DrawingChoice } from '@/components/owner/DrawingUploadStep';
import { WizardProjectTextFields } from '@/components/owner/WizardProjectTextFields';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import {
  IndianCityAutocomplete,
  parseIndianDistrictSelection,
} from '@/components/shared/IndianCityAutocomplete';
import { sortBuildingTypes } from '@/lib/buildingConfig';
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig';
import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import {
  formatBudgetRange,
  formatIndianInputDisplay,
  parseIndianAmount,
} from '@/lib/formatIndianCurrency';
import { uploadProjectDrawing } from '@/lib/project/uploadDrawing';
import { createProjectAction } from '@/app/actions/createProject';
import { hasContactInfo, hasProjectContactViolation } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import type { FinishingLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = [
  'Project Info',
  'Type of Building',
  'Construction Scope',
  'Finishing Level',
  'Drawing',
  'Review',
] as const;

interface FirmFormState {
  title: string;
  description: string;
  location: string;
  pincode: string;
  floor_area_sqft: string;
  budget_min: string;
  budget_max: string;
  building_types: BuildingType[];
  construction_types: ConstructionTypesMap;
  finishing_level: FinishingLevel | null;
  drawing_choice: DrawingChoice;
}

const EMPTY_FORM: FirmFormState = {
  title: '',
  description: '',
  location: '',
  pincode: '',
  floor_area_sqft: '',
  budget_min: '',
  budget_max: '',
  building_types: [],
  construction_types: {},
  finishing_level: null,
  drawing_choice: null,
};

export function ConstructionFirmProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FirmFormState>(EMPTY_FORM);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [step3ValidationAttempted, setStep3ValidationAttempted] = useState(false);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    pincode?: string;
  }>({});
  const [biddingEndsAt, setBiddingEndsAt] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  function update<K extends keyof FirmFormState>(key: K, value: FirmFormState[K]) {
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

  const contactViolation = hasProjectContactViolation(form.title, form.description);
  const canStep2 = form.title.trim().length >= 5 && !contactViolation;
  const budgetPreview = formatBudgetRange(
    parseIndianAmount(form.budget_min),
    parseIndianAmount(form.budget_max),
  );

  const canStep5 = form.finishing_level !== null;
  const canStep6 =
    form.drawing_choice === 'firm_creates' ||
    (form.drawing_choice === 'upload' && !!drawingFile);

  const orderedBuildingTypes = sortBuildingTypes(form.building_types);
  const allConstructionSelected =
    orderedBuildingTypes.length > 0 &&
    orderedBuildingTypes.every((t) => !!form.construction_types[t]);

  function tryGoStep2() {
    if (form.title.trim().length < 5) return;

    const errors: typeof step1Errors = {};

    if (!parseIndianDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the suggestions list.';
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

    if (contactViolation) {
      if (hasContactInfo(form.title)) {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleRef.current?.focus();
      } else {
        descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        descriptionRef.current?.focus();
      }
      return;
    }

    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep(2);
  }

  function tryGoStep3() {
    if (form.building_types.length === 0) {
      setStep2Error('Please select at least one building type.');
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  function tryGoStep4() {
    const ordered = sortBuildingTypes(form.building_types);
    const missing = ordered.filter((t) => !form.construction_types[t]);
    if (missing.length > 0) {
      setStep3ValidationAttempted(true);
      setStep3Error('Please select a construction type for each floor.');
      return;
    }
    setStep3Error(null);
    setStep3ValidationAttempted(false);
    setStep(4);
  }

  async function handleSubmit() {
    if (!profile || !form.finishing_level) return;
    const districtSelection = parseIndianDistrictSelection(form.location);
    if (!districtSelection) return;

    setLoading(true);
    setError(null);

    if (hasProjectContactViolation(form.title, form.description)) {
      setError('Remove contact details from the project title or description before submitting.');
      setLoading(false);
      return;
    }

    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) {
      setError(pincodeError);
      setLoading(false);
      return;
    }

    const result = await createProjectAction({
      service_type: 'construction_firm',
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      building_types: form.building_types,
      construction_types: form.construction_types,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      floor_area_sqft: form.floor_area_sqft ? parseFloat(form.floor_area_sqft) : null,
      finishing_level: form.finishing_level,
      budget_range_min: parseIndianAmount(form.budget_min),
      budget_range_max: parseIndianAmount(form.budget_max),
      drawing_url: form.drawing_choice === 'firm_creates' ? null : undefined,
      bidding_minutes: BIDDING_MINUTES,
    });

    if (result.error || !result.projectId) {
      setError(result.error ?? 'Could not create project.');
      setLoading(false);
      return;
    }

    if (form.drawing_choice === 'upload' && drawingFile) {
      const up = await uploadProjectDrawing(result.projectId, drawingFile);
      if (up.error) {
        setError(up.error);
        setLoading(false);
        return;
      }
    }

    setProjectId(result.projectId);
    setBiddingEndsAt(result.biddingEndsAt ?? null);
    setStep(7);
    setLoading(false);
  }

  const reviewProject = {
    building_types: form.building_types,
    construction_types: form.construction_types,
    track_type: 'RCC' as const,
    sub_configuration: {},
  };

  const finishingCfg = form.finishing_level
    ? FINISHING_LEVEL_CONFIG[form.finishing_level]
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Post Construction Firm Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Turnkey construction — firms bid a single ₹/sqft rate for the full project.
        </p>
      </div>

      {step < 7 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PROGRESS_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                  i + 1 < step ? 'bg-indigo-500 text-white' :
                  i + 1 === step ? 'bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400' :
                  'bg-secondary text-muted-foreground/80',
                )}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-[10px] sm:text-xs truncate',
                i + 1 === step ? 'text-foreground font-semibold' : 'text-muted-foreground',
              )}>
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

              <WizardProjectTextFields
                title={form.title}
                description={form.description}
                onTitleChange={(v) => update('title', v)}
                onDescriptionChange={(v) => update('description', v)}
                titleLabel="Project Title *"
                descriptionLabel="Additional Notes (Optional)"
                titlePlaceholder="e.g. 3BHK Residential Home, Guwahati"
                descriptionPlaceholder="Any special requirements, preferences, or notes for the construction firm..."
                descriptionMaxLength={500}
                titleRef={titleRef}
                descriptionRef={descriptionRef}
              />

              <IndianCityAutocomplete
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

              <div>
                <Input
                  label="Approximate Plot Area (sqft)"
                  type="number"
                  min={100}
                  max={50000}
                  placeholder="e.g. 1500"
                  value={form.floor_area_sqft}
                  onChange={(e) => update('floor_area_sqft', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Optional — helps firms estimate total project cost
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Your Budget Range (Optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Min ₹"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 25,00,000"
                    value={form.budget_min}
                    onChange={(e) => update('budget_min', formatIndianInputDisplay(e.target.value))}
                  />
                  <Input
                    label="Max ₹"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 40,00,000"
                    value={form.budget_max}
                    onChange={(e) => update('budget_max', formatIndianInputDisplay(e.target.value))}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Sharing a budget helps firms give you more accurate bids</p>
                {budgetPreview && (
                  <p className="text-sm font-semibold text-indigo-400 mt-2">{budgetPreview}</p>
                )}
              </div>

              <Button size="lg" className="w-full" disabled={!canStep2} onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Type of Building</h2>
                <p className="text-sm text-muted-foreground mt-1">Select the type and floors of your building</p>
                <p className="text-[11px] text-muted-foreground/80 mt-2">
                  e.g. G+1 home? Select Ground Floor + 1st Floor<br />
                  e.g. Already have Ground Floor? Select only upper floors needed
                </p>
              </div>
              <BuildingTypeSelector
                value={form.building_types}
                onChange={(v) => { update('building_types', v); setStep2Error(null); }}
                error={step2Error}
              />
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
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Construction Scope</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    For each floor, pick how far the builder should go.
                  </p>
                </div>

                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-violet-500 transition-all"
                    style={{ width: '72%' }}
                  />
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                          n < 3 && 'bg-emerald-500 text-white',
                          n === 3 && 'bg-violet-500/20 border-2 border-violet-500 text-violet-400',
                          n > 3 && 'bg-secondary text-muted-foreground/80',
                        )}
                      >
                        {n < 3 ? '✓' : n}
                      </div>
                      {n < 4 && (
                        <div
                          className={cn(
                            'h-px w-6 sm:w-10',
                            n < 3 ? 'bg-emerald-500/50' : 'bg-secondary',
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {step3Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step3Error}</p>
                </div>
              )}

              <ConstructionTypeSelector
                buildingTypes={form.building_types}
                value={form.construction_types}
                onChange={(v) => {
                  update('construction_types', v);
                  setStep3Error(null);
                  if (sortBuildingTypes(form.building_types).every((t) => v[t])) {
                    setStep3ValidationAttempted(false);
                  }
                }}
                showValidation={step3ValidationAttempted}
              />

              <Button variant="outline" size="lg" className="w-full" onClick={() => {
                setStep3ValidationAttempted(false);
                setStep3Error(null);
                setStep(2);
              }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                size="lg"
                disabled={!allConstructionSelected}
                onClick={tryGoStep4}
                className={cn(
                  'w-full rounded-2xl font-bold h-12 text-base',
                  allConstructionSelected &&
                    'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/25 border-0',
                )}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <FinishingLevelSelector
                value={form.finishing_level}
                onChange={(v) => update('finishing_level', v)}
              />
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={!canStep5} onClick={() => setStep(5)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <DrawingUploadStep
                choice={form.drawing_choice}
                onChoiceChange={(c) => update('drawing_choice', c)}
                file={drawingFile}
                onFileChange={setDrawingFile}
              />
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(4)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={!canStep6} onClick={() => setStep(6)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Review & Submit</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Service Type', value: '🏗️ Construction Firm', editStep: null },
                  { label: 'Project Title', value: form.title, editStep: 1 as Step },
                  { label: 'District', value: form.location || '—', editStep: 1 as Step },
                  {
                    label: 'Pincode',
                    value: form.pincode.trim() || 'Not specified',
                    editStep: 1 as Step,
                  },
                  {
                    label: 'Floor Area',
                    value: form.floor_area_sqft ? `${form.floor_area_sqft} sqft` : 'Not specified',
                    editStep: 1 as Step,
                  },
                  {
                    label: 'Budget Range',
                    value: budgetPreview ?? 'Not specified',
                    editStep: 1 as Step,
                  },
                  {
                    label: 'Building Type',
                    value: <BuildingConfigSummary project={reviewProject} compact className="text-right" />,
                    editStep: 2 as Step,
                  },
                  {
                    label: 'Construction Scope',
                    value: (
                      <BuildingConfigSummary project={reviewProject} className="text-right space-y-2" />
                    ),
                    editStep: 3 as Step,
                  },
                  {
                    label: 'Finishing Level',
                    value: finishingCfg ? `${finishingCfg.title} (${finishingCfg.classBadge})` : '—',
                    editStep: 4 as Step,
                  },
                  {
                    label: 'Drawing',
                    value: form.drawing_choice === 'upload' && drawingFile
                      ? `Uploaded: ${drawingFile.name}`
                      : 'Firm will create drawing',
                    editStep: 5 as Step,
                  },
                  { label: 'Bidding Opens', value: 'Immediately upon submission', editStep: null },
                  {
                    label: 'Bidding Closes',
                    value: `${BIDDING_MINUTES} minutes from launch`,
                    editStep: null,
                  },
                ].map(({ label, value, editStep }) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground text-right">
                      <div>{value}</div>
                      {editStep && (
                        <button type="button" onClick={() => setStep(editStep)} className="text-[10px] text-indigo-400 hover:underline flex-shrink-0">
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="lg" className="w-full" onClick={() => setStep(5)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                size="lg"
                disabled={loading}
                onClick={handleSubmit}
                className="w-full rounded-2xl font-bold h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Posting your project…
                  </span>
                ) : (
                  'Post Project & Start Bidding 🚀'
                )}
              </Button>
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Your project is live! 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  Construction firms can now place bids on <strong className="text-foreground">&quot;{form.title}&quot;</strong>
                </p>
              </div>
              {biddingEndsAt && (
                <div className="w-full px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-2">Bidding closes in</p>
                  <CountdownTicker targetDateISO={biddingEndsAt} />
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => router.push(projectId ? `/dashboard/owner/project/${projectId}` : '/dashboard/owner')}
              >
                View My Project <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

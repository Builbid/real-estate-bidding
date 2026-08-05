'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Info, Lock } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import { ConstructionTypeSelector } from '@/components/construction/ConstructionTypeSelector';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import {
  IndianCityAutocomplete,
  parseIndianDistrictSelection,
} from '@/components/shared/IndianCityAutocomplete';
import { formatBuildingTypesSummary, sortBuildingTypes } from '@/lib/buildingConfig';
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig';
import {
  formatBudgetRange,
  formatIndianInputDisplay,
  parseIndianAmount,
} from '@/lib/formatIndianCurrency';
import { createProjectAction } from '@/app/actions/createProject';
import { CONTACT_INFO_WARNING, hasContactInfo } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = [
  'Project Info',
  'Type of Building',
  'Construction Scope',
  'Review',
] as const;

interface FirmFormState {
  description: string;
  location: string;
  pincode: string;
  floor_area_sqft: string;
  budget_max: string;
  building_types: BuildingType[];
  construction_types: ConstructionTypesMap;
}

const EMPTY_FORM: FirmFormState = {
  description: '',
  location: '',
  pincode: '',
  floor_area_sqft: '',
  budget_max: '',
  building_types: [],
  construction_types: {},
};

export function ConstructionFirmProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FirmFormState>(EMPTY_FORM);
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

  const descriptionHasContact = hasContactInfo(form.description);
  const budgetPreview = formatBudgetRange(null, parseIndianAmount(form.budget_max));

  const orderedBuildingTypes = sortBuildingTypes(form.building_types);
  const allConstructionSelected =
    orderedBuildingTypes.length > 0 &&
    orderedBuildingTypes.every((t) => !!form.construction_types[t]);

  function tryGoStep2() {
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

    if (descriptionHasContact) {
      descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      descriptionRef.current?.focus();
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
    if (!profile) return;
    const districtSelection = parseIndianDistrictSelection(form.location);
    if (!districtSelection) return;

    setLoading(true);
    setError(null);

    if (hasContactInfo(form.description)) {
      setError('Remove contact details from the project description before submitting.');
      setLoading(false);
      return;
    }

    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) {
      setError(pincodeError);
      setLoading(false);
      return;
    }

    const buildingSummary = formatBuildingTypesSummary(form.building_types) || 'Construction Project';
    const autoTitle = `${buildingSummary} — ${districtSelection.district}`;

    const result = await createProjectAction({
      service_type: 'construction_firm',
      title: autoTitle,
      description: form.description.trim() || undefined,
      building_types: form.building_types,
      construction_types: form.construction_types,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      floor_area_sqft: form.floor_area_sqft ? parseFloat(form.floor_area_sqft) : null,
      finishing_level: null,
      budget_range_min: null,
      budget_range_max: parseIndianAmount(form.budget_max),
      drawing_url: null,
      bidding_minutes: BIDDING_MINUTES,
    });

    if (result.error || !result.projectId) {
      setError(result.error ?? 'Could not create project.');
      setLoading(false);
      return;
    }

    setProjectId(result.projectId);
    setBiddingEndsAt(result.biddingEndsAt ?? null);
    setStep(5);
    setLoading(false);
  }

  const reviewProject = {
    building_types: form.building_types,
    construction_types: form.construction_types,
    track_type: 'RCC' as const,
    sub_configuration: {},
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Post Construction Firm Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Turnkey construction — firms bid a single ₹/sqft rate for the full project.
        </p>
      </div>

      {step < 5 && (
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Project Description (Optional)
                </label>
                <textarea
                  ref={descriptionRef}
                  className={cn(
                    'w-full min-h-[80px] rounded-lg border border-border bg-card/80 dark:bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none',
                    descriptionHasContact &&
                      'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/40',
                  )}
                  placeholder="Describe your project — house type, requirements, preferences..."
                  value={form.description}
                  maxLength={500}
                  onChange={(e) => update('description', e.target.value.slice(0, 500))}
                />
                {descriptionHasContact && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 leading-snug">
                    {CONTACT_INFO_WARNING}
                  </p>
                )}
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  <Lock className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden />
                  <span>
                    Do not share phone numbers, emails or personal contact details. BuilBid
                    protects your privacy.
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground text-right">
                  {form.description.length}/500
                </p>
              </div>

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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Your Maximum Budget (Optional)
                </p>
                <Input
                  label="Max ₹"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 40,00,000"
                  value={form.budget_max}
                  onChange={(e) => update('budget_max', formatIndianInputDisplay(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Sharing a budget helps firms give you more accurate bids</p>
                {budgetPreview && (
                  <p className="text-sm font-semibold text-indigo-400 mt-2">{budgetPreview}</p>
                )}
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
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

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label
                    htmlFor="floor-area-sqft"
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Total Slab Area of All the Floors (in Sqft) Approx (Optional)
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="How slab area is used to estimate construction cost"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="text-xs max-w-[280px]">
                      <p className="font-semibold text-foreground mb-1.5">
                        Approximate construction cost
                      </p>
                      <p className="text-muted-foreground leading-snug">
                        Construction firms bid a ₹/sqft rate. The approximate total cost of
                        building your home is calculated by multiplying:
                      </p>
                      <p className="mt-2 font-medium text-foreground leading-snug">
                        Firm construction rate × Total slab area
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  id="floor-area-sqft"
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
                serviceType="construction_firm"
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
              <h2 className="text-base font-semibold text-foreground">Review & Submit</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Service Type', value: '🏗️ Construction Firm', editStep: null },
                  { label: 'District', value: form.location || '—', editStep: 1 as Step },
                  {
                    label: 'Pincode',
                    value: form.pincode.trim() || 'Not specified',
                    editStep: 1 as Step,
                  },
                  {
                    label: 'Your Maximum Budget',
                    value: budgetPreview ?? 'Not specified',
                    editStep: 1 as Step,
                  },
                  {
                    label: 'Building Type',
                    value: <BuildingConfigSummary project={reviewProject} compact className="text-right" />,
                    editStep: 2 as Step,
                  },
                  {
                    label: 'Total Slab Area of All the Floors (in Sqft) Approx',
                    value: form.floor_area_sqft ? `${form.floor_area_sqft} sqft` : 'Not specified',
                    editStep: 2 as Step,
                  },
                  {
                    label: 'Construction Scope',
                    value: (
                      <BuildingConfigSummary project={reviewProject} className="text-right space-y-2" />
                    ),
                    editStep: 3 as Step,
                  },
                  { label: 'Bidding Opens', value: 'Immediately upon submission', editStep: null },
                  {
                    label: 'Bidding Closes',
                    value: `${BIDDING_MINUTES} minutes from launch`,
                    editStep: null,
                  },
                ].map(({ label, value, editStep }) => (
                  <div key={label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-muted-foreground flex-1 min-w-0">{label}</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground text-right flex-shrink-0 max-w-[55%]">
                      <div className="min-w-0">{value}</div>
                      {editStep && (
                        <button type="button" onClick={() => setStep(editStep)} className="text-[10px] text-indigo-400 hover:underline flex-shrink-0">
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="lg" className="w-full" onClick={() => setStep(3)}>
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

          {step === 5 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Your project is live! 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  Construction firms can now place bids on your project
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

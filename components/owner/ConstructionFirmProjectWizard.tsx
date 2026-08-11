'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import type { BuildingType } from '@/lib/buildingConfig';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import {
  formatBudgetRange,
  formatIndianInputDisplay,
  parseIndianAmount,
} from '@/lib/formatIndianCurrency';
import { createProjectAction } from '@/app/actions/createProject';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = [
  'Project Info',
  'Type of Building',
  'Review',
] as const;

interface FirmFormState {
  location: string;
  pincode: string;
  floor_area_sqft: string;
  budget_max: string;
  bidding_minutes: string;
  building_types: BuildingType[];
}

const EMPTY_FORM: FirmFormState = {
  location: '',
  pincode: '',
  floor_area_sqft: '',
  budget_max: '',
  bidding_minutes: String(BIDDING_MINUTES),
  building_types: [],
};

export function ConstructionFirmProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FirmFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [step2Error, setStep2Error] = useState<string | null>(null);
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

  const budgetPreview = formatBudgetRange(null, parseIndianAmount(form.budget_max));

  const districtSelection = parseAssamDistrictSelection(form.location);
  const previewTitle = generateProjectTitle({
    serviceType: 'construction_firm',
    district: districtSelection?.district ?? form.location,
    buildingTypes: form.building_types,
  });

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
    if (form.building_types.length === 0) {
      setStep2Error('Please select at least one building type.');
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (!profile) return;
    const districtSelection = parseAssamDistrictSelection(form.location);
    if (!districtSelection) return;

    setLoading(true);
    setError(null);

    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) {
      setError(pincodeError);
      setLoading(false);
      return;
    }

    const autoTitle = generateProjectTitle({
      serviceType: 'construction_firm',
      district: districtSelection.district,
      buildingTypes: form.building_types,
    });

    const result = await createProjectAction({
      service_type: 'construction_firm',
      title: autoTitle,
      building_types: form.building_types,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      floor_area_sqft: form.floor_area_sqft ? parseFloat(form.floor_area_sqft) : null,
      finishing_level: null,
      budget_range_min: null,
      budget_range_max: parseIndianAmount(form.budget_max),
      drawing_url: null,
      bidding_minutes: parseInt(form.bidding_minutes, 10) || BIDDING_MINUTES,
    });

    if (result.error || !result.projectId) {
      setError(result.error ?? 'Could not create project.');
      setLoading(false);
      return;
    }

    setProjectId(result.projectId);
    setBiddingEndsAt(result.biddingEndsAt ?? null);
    setStep(4);
    setLoading(false);
  }

  const reviewProject = {
    building_types: form.building_types,
    construction_types: {},
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

      {step < 4 && (
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
                <p className="text-[11px] text-muted-foreground">
                  Choose how long construction firms can bid. After bidding closes you have 5 minutes to select a firm.
                </p>
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Type of Building</h2>
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
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Review & Submit</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm details before your project goes live for bidding
                </p>
              </div>

              {/* Service banner */}
              <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-transparent px-4 py-3.5">
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/20 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15 text-2xl">
                    🏢
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                      Service
                    </p>
                    <p className="text-base font-bold text-foreground">Construction Firm</p>
                  </div>
                </div>
              </div>

              {/* Project overview */}
              <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Project overview
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Edit
                  </button>
                </div>
                <dl className="divide-y divide-border/50">
                  {[
                    { label: 'Project title', value: previewTitle },
                    { label: 'District', value: form.location || '—' },
                    { label: 'Pincode', value: form.pincode.trim() || 'Not specified' },
                    { label: 'Max budget', value: budgetPreview ?? 'Not specified' },
                    {
                      label: 'Total slab area',
                      value: form.floor_area_sqft ? `${form.floor_area_sqft} sqft` : 'Not specified',
                    },
                    {
                      label: 'Bidding duration',
                      value:
                        form.bidding_minutes === '7'
                          ? '7 minutes (Quick)'
                          : '24 hours (Standard)',
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
                      <dt className="text-xs text-muted-foreground">{row.label}</dt>
                      <dd className="text-sm font-semibold text-foreground text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Building types only — firm projects have no Skeleton/Full Finishing choice */}
              <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Type of building
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Edit
                  </button>
                </div>
                <div className="p-3.5">
                  <BuildingConfigSummary project={reviewProject} hideConstructionTypes />
                </div>
              </section>

              {/* Auction timing */}
              <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.04] px-4 py-3.5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Auction timing
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {[
                    { label: 'Opens', value: 'On submit' },
                    {
                      label: 'Closes',
                      value: form.bidding_minutes === '7' ? '7 min' : '24 hrs',
                    },
                    { label: 'Select firm', value: '5 min window' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-center"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-col gap-3 pt-1">
                <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="h-12 w-full rounded-2xl border-0 bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-bold shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-400"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Posting your project…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Post Project & Start Bidding
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
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

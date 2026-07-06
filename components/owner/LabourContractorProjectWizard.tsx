'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import { ConstructionTypeSelector } from '@/components/construction/ConstructionTypeSelector';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { sortBuildingTypes } from '@/lib/buildingConfig';
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig';
import {
  IndianCityAutocomplete,
  parseIndianDistrictSelection,
} from '@/components/shared/IndianCityAutocomplete';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3 | 4 | 5;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = [
  'Project Info',
  'Type of Building',
  'Type of Construction',
  'Review & Launch',
] as const;

interface FormState {
  title: string;
  description: string;
  location: string;
  plot_area_sqft: string;
  bidding_minutes: string;
  building_types: BuildingType[];
  construction_types: ConstructionTypesMap;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  location: '',
  plot_area_sqft: '',
  bidding_minutes: String(BIDDING_MINUTES),
  building_types: [],
  construction_types: {},
};

function parsePlotArea(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function LabourContractorProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [step3ValidationAttempted, setStep3ValidationAttempted] = useState(false);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{
    title?: string;
    location?: string;
    plot_area_sqft?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (
      step1ValidationAttempted &&
      (key === 'title' || key === 'location' || key === 'plot_area_sqft')
    ) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'title') delete next.title;
        if (key === 'location') delete next.location;
        if (key === 'plot_area_sqft') delete next.plot_area_sqft;
        return next;
      });
    }
  }

  function tryGoStep2() {
    const errors: typeof step1Errors = {};

    if (!form.title.trim()) {
      errors.title = 'Project title is required.';
    }

    if (!parseIndianDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the suggestions list.';
    }

    if (parsePlotArea(form.plot_area_sqft) === null) {
      errors.plot_area_sqft = 'Plot area is required and must be a positive number.';
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
      setStep2Error('Please select at least one building type to continue.');
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

  const orderedBuildingTypes = sortBuildingTypes(form.building_types);
  const allConstructionSelected =
    orderedBuildingTypes.length > 0 &&
    orderedBuildingTypes.every((t) => !!form.construction_types[t]);

  async function handleSubmit() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const districtSelection = parseIndianDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the suggestions list.');
      setLoading(false);
      return;
    }

    const plotArea = parsePlotArea(form.plot_area_sqft);
    if (plotArea === null) {
      setError('Plot area is required and must be a positive number.');
      setLoading(false);
      return;
    }

    const result = await createProjectAction({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      building_types: form.building_types,
      construction_types: form.construction_types,
      district: districtSelection.district,
      state: districtSelection.state,
      plot_area_sqft: plotArea,
      bidding_minutes: parseInt(form.bidding_minutes, 10),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

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
        <h1 className="text-xl font-bold text-foreground">Post New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your construction project and choose how long builders can bid.
        </p>
      </div>

      {step < 5 && (
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

              <Input
                label="Project Title"
                type="text"
                placeholder="e.g. 2BHK Residential Construction, Delhi"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                error={step1ValidationAttempted ? step1Errors.title : undefined}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description (optional)
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-border bg-card/80 dark:bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  placeholder="Additional notes about the project..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>

              <IndianCityAutocomplete
                value={form.location}
                onChange={(v) => update('location', v)}
                error={step1ValidationAttempted ? step1Errors.location : undefined}
              />

              <Input
                label="Plot Area (sqft)"
                type="number"
                placeholder="e.g. 1500"
                value={form.plot_area_sqft}
                onChange={(e) => update('plot_area_sqft', e.target.value)}
                error={step1ValidationAttempted ? step1Errors.plot_area_sqft : undefined}
                prefix={<MapPin className="w-3.5 h-3.5" />}
                required
                min={1}
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
                  After bidding closes you have 5 minutes to select a builder.
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
                onChange={(v) => {
                  update('building_types', v);
                  setStep2Error(null);
                  const nextTypes = sortBuildingTypes(v);
                  const nextConstruction: ConstructionTypesMap = {};
                  nextTypes.forEach((t) => {
                    if (form.construction_types[t]) {
                      nextConstruction[t] = form.construction_types[t];
                    }
                  });
                  update('construction_types', nextConstruction);
                }}
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
                Continue to Review <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Review & Launch Auction</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Project Title', value: form.title },
                  { label: 'District', value: form.location },
                  {
                    label: 'Building Types',
                    value: (
                      <BuildingConfigSummary project={reviewProject} compact className="text-right" />
                    ),
                  },
                  {
                    label: 'Construction Scope',
                    value: (
                      <BuildingConfigSummary project={reviewProject} className="text-right space-y-2" />
                    ),
                  },
                  {
                    label: 'Bidding Window',
                    value:
                      form.bidding_minutes === '7'
                        ? '7 minutes from launch'
                        : '24 hours from launch',
                  },
                  { label: 'Selection Window', value: '5 minutes after bids close' },
                  { label: 'Plot Area', value: `${form.plot_area_sqft} sqft` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
                    <div className="text-sm font-semibold text-foreground text-right">{value}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(3)}>
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

          {step === 5 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Auction Launched! 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  Your project <strong className="text-foreground">&quot;{form.title}&quot;</strong> is now live.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep(1);
                    setForm(EMPTY_FORM);
                    setStep1ValidationAttempted(false);
                    setStep1Errors({});
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

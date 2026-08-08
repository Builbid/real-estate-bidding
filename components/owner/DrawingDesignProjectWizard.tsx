'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import {
  IndianCityAutocomplete,
  parseIndianDistrictSelection,
} from '@/components/shared/IndianCityAutocomplete';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import {
  DRAWING_TYPE_OPTIONS,
  formatDrawingTypesSummary,
} from '@/lib/drawingDesign';
import { formatBuildingTypesSummary, sortBuildingTypes, type BuildingType } from '@/lib/buildingConfig';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';
import type { DrawingDesignType } from '@/lib/types';

type Step = 1 | 2 | 3;

const BIDDING_MINUTES = 7;
const PROGRESS_LABELS = ['House Type', 'Drawing Types', 'Review & Launch'] as const;

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  building_types: BuildingType[];
  drawing_types: DrawingDesignType[];
}

const EMPTY_FORM: FormState = {
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  building_types: [],
  drawing_types: [],
};

export function DrawingDesignProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
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

  function toggleDrawing(type: DrawingDesignType) {
    setForm((f) => {
      const has = f.drawing_types.includes(type);
      return {
        ...f,
        drawing_types: has
          ? f.drawing_types.filter((t) => t !== type)
          : [...f.drawing_types, type],
      };
    });
    setStep2Error(null);
  }

  function tryGoStep2() {
    const errors: typeof step1Errors = {};
    if (!parseIndianDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the suggestions list.';
    }
    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) errors.pincode = pincodeError;

    if (Object.keys(errors).length > 0) {
      setStep1ValidationAttempted(true);
      setStep1Errors(errors);
      setStep1Error(null);
      return;
    }
    if (form.building_types.length === 0) {
      setStep1ValidationAttempted(true);
      setStep1Errors({});
      setStep1Error('Select Assam Type or one or more RCC floors.');
      return;
    }
    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep1Error(null);
    setStep(2);
  }

  function tryGoStep3() {
    if (form.drawing_types.length === 0) {
      setStep2Error('Select at least one drawing / design type to continue.');
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (form.building_types.length === 0 || form.drawing_types.length === 0) return;
    setLoading(true);
    setError(null);

    const districtSelection = parseIndianDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the suggestions list.');
      setLoading(false);
      return;
    }

    const houseSummary = formatBuildingTypesSummary(form.building_types) || 'House';
    const autoTitle = `${houseSummary} — Drawing & Design — ${districtSelection.district}`;

    const result = await createProjectAction({
      service_type: 'drawing_design',
      title: autoTitle,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10) || BIDDING_MINUTES,
      building_types: form.building_types,
      drawing_types: form.drawing_types,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push('/dashboard/owner');
  }

  const orderedTypes = sortBuildingTypes(form.building_types);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span>✏️</span> Post Drawing and Design Project
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select your house type and the drawings you need — designers will bid on your project.
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
                i + 1 === step ? 'font-semibold text-foreground' : 'text-muted-foreground',
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
              <h2 className="text-base font-semibold text-foreground">Location & type of house</h2>

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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

              <div className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">Type of House</h3>
                <BuildingTypeSelector
                  purpose="drawing"
                  value={form.building_types}
                  onChange={(v) => {
                    update('building_types', v);
                    setStep1Error(null);
                  }}
                  error={step1Error}
                />
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-base font-semibold text-foreground">What drawings do you need?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select one or more options — you can choose as many as you want.
                </p>
              </div>

              {step2Error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DRAWING_TYPE_OPTIONS.map((opt) => {
                  const selected = form.drawing_types.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleDrawing(opt.value)}
                      className={cn(
                        'relative rounded-xl border-2 p-4 text-left transition-all',
                        selected
                          ? 'border-sky-500/70 bg-sky-500/10 shadow-md shadow-sky-500/10 scale-[1.01]'
                          : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-2xl leading-none">{opt.emoji}</span>
                        {selected && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />}
                      </div>
                      <p className="text-sm font-bold text-foreground">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {form.drawing_types.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {form.drawing_types.length} selected
                </p>
              )}

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
              <h2 className="text-base font-semibold text-foreground">Review & Launch</h2>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 divide-y divide-border/50">
                {[
                  { label: 'Service', value: '✏️ Drawing and Design' },
                  { label: 'District', value: form.location },
                  { label: 'Pincode', value: form.pincode.trim() || 'Not specified' },
                  {
                    label: 'Type of house',
                    value: formatBuildingTypesSummary(orderedTypes),
                  },
                  {
                    label: 'Drawings needed',
                    value: formatDrawingTypesSummary(form.drawing_types),
                  },
                  {
                    label: 'Bidding window',
                    value:
                      form.bidding_minutes === '7'
                        ? '7 minutes from launch'
                        : '24 hours from launch',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{row.label}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    House type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {orderedTypes.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-semibold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Selected drawings
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {form.drawing_types.map((t) => {
                      const opt = DRAWING_TYPE_OPTIONS.find((o) => o.value === t);
                      return (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-foreground"
                        >
                          <span aria-hidden>{opt?.emoji}</span>
                          {opt?.label ?? t}
                        </span>
                      );
                    })}
                  </div>
                </div>
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

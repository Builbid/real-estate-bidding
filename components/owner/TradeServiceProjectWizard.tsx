'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { WizardProjectTextFields } from '@/components/owner/WizardProjectTextFields';
import {
  IndianCityAutocomplete,
  parseIndianDistrictSelection,
} from '@/components/shared/IndianCityAutocomplete';
import { hasContactInfo, hasProjectContactViolation } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { getTradeLabel, getTradeEmoji } from '@/lib/trades';
import {
  PAINTER_FINISH_OPTIONS,
  PAINTER_PRIMER_OPTIONS,
  PAINTER_SCOPE_OPTIONS,
  PAINTER_START_TIME_OPTIONS,
  PAINTER_SURFACE_OPTIONS,
  PAINTER_TOPCOAT_OPTIONS,
  getPainterWorkRequirementBlocks,
  validatePainterDetailsInput,
  type PainterPaintFinish,
  type PainterPaintTopcoats,
  type PainterPaintingScope,
  type PainterPrimerRequirement,
  type PainterStartTimeType,
  type PainterSurfaceCondition,
} from '@/lib/painterDetails';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';
import type { TrackType, TradeServiceType } from '@/lib/types';

type Step = 1 | 2 | 3;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = ['Project Info', 'Building Type', 'Review & Launch'] as const;

const BUILDING_TYPE_OPTIONS: { value: TrackType; label: string; description: string }[] = [
  { value: 'RCC', label: 'RCC', description: 'Reinforced cement concrete building' },
  { value: 'AssamType', label: 'Assam Type', description: 'Traditional Assam-type building' },
];

interface FormState {
  title: string;
  description: string;
  location: string;
  pincode: string;
  bidding_minutes: string;
  track_type: TrackType | null;
  /** Painter-only */
  projectArea: string;
  paintingScope: PainterPaintingScope | null;
  paintFinish: PainterPaintFinish | null;
  surfaceCondition: PainterSurfaceCondition | null;
  primerRequirement: PainterPrimerRequirement | '';
  paintTopcoats: PainterPaintTopcoats | null;
  projectStartTimeType: PainterStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  track_type: null,
  projectArea: '',
  paintingScope: null,
  paintFinish: null,
  surfaceCondition: null,
  primerRequirement: '',
  paintTopcoats: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
};

interface TradeServiceProjectWizardProps {
  trade: TradeServiceType;
}

export function TradeServiceProjectWizard({ trade }: TradeServiceProjectWizardProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{
    title?: string;
    location?: string;
    pincode?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const tradeLabel = getTradeLabel(trade);
  const tradeEmoji = getTradeEmoji(trade);
  const isPainter = trade === 'painter';
  const contactViolation = hasProjectContactViolation(form.title, form.description);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (step1ValidationAttempted && (key === 'title' || key === 'location' || key === 'pincode')) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'title') delete next.title;
        if (key === 'location') delete next.location;
        if (key === 'pincode') delete next.pincode;
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
    if (!form.track_type) {
      setStep2Error('Please select a building type to continue.');
      return;
    }
    if (isPainter) {
      const validated = validatePainterDetailsInput({
        projectArea: form.projectArea,
        primerRequirement: form.primerRequirement,
        projectStartTimeType: form.projectStartTimeType,
        projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
        paintingScope: form.paintingScope,
        paintFinish: form.paintFinish,
        surfaceCondition: form.surfaceCondition,
        paintTopcoats: form.paintTopcoats,
        additionalRequirements: form.additionalRequirements,
      });
      if ('error' in validated) {
        setStep2Error(validated.error);
        return;
      }
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (!form.track_type) return;
    setLoading(true);
    setError(null);

    const districtSelection = parseIndianDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the suggestions list.');
      setLoading(false);
      return;
    }

    if (hasProjectContactViolation(form.title, form.description)) {
      setError('Remove contact details from the project title or description before submitting.');
      setLoading(false);
      return;
    }

    let painterDetails;
    if (isPainter) {
      const validated = validatePainterDetailsInput({
        projectArea: form.projectArea,
        primerRequirement: form.primerRequirement,
        projectStartTimeType: form.projectStartTimeType,
        projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
        paintingScope: form.paintingScope,
        paintFinish: form.paintFinish,
        surfaceCondition: form.surfaceCondition,
        paintTopcoats: form.paintTopcoats,
        additionalRequirements: form.additionalRequirements,
      });
      if ('error' in validated) {
        setError(validated.error);
        setLoading(false);
        return;
      }
      painterDetails = validated.details;
    }

    const result = await createProjectAction({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      track_type: form.track_type,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10),
      service_type: trade,
      ...(painterDetails ? { painter_details: painterDetails } : {}),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/dashboard/owner');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span>{tradeEmoji}</span> Post {tradeLabel} Project
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registered {tradeLabel.toLowerCase()}s will bid their rate per sqft on your project.
        </p>
      </div>

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
                titleLabel="Project Title"
                titlePlaceholder={`e.g. ${tradeLabel} work for 2BHK house, Guwahati`}
                titleRequiredError={step1ValidationAttempted ? step1Errors.title : undefined}
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
                  After bidding closes you have 5 minutes to select a {tradeLabel.toLowerCase()}.
                </p>
              </div>

              <Button size="lg" className="w-full" disabled={contactViolation} onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">
                {isPainter ? 'Building Type & Work Requirements' : 'Type of Building'}
              </h2>
              <p className="text-xs text-muted-foreground -mt-3">
                {isPainter
                  ? 'Tell painters the building type, area, primer, materials, and when work should start.'
                  : `Choose the building type so ${tradeLabel.toLowerCase()}s know what they are bidding on.`}
              </p>

              {step2Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUILDING_TYPE_OPTIONS.map((opt) => {
                  const selected = form.track_type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        update('track_type', opt.value);
                        setStep2Error(null);
                      }}
                      className={cn(
                        'text-left rounded-xl border-2 p-4 transition-all duration-200',
                        selected
                          ? 'border-emerald-500/70 bg-emerald-500/8 shadow-md shadow-emerald-500/15 scale-[1.02]'
                          : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground">{opt.label}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </button>
                  );
                })}
              </div>

              {isPainter && (
                <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
                  <Input
                    label="Project Area (sq.ft.)"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="1"
                    placeholder="e.g. 1200"
                    value={form.projectArea}
                    onChange={(e) => {
                      update('projectArea', e.target.value);
                      setStep2Error(null);
                    }}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Painting Scope
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {PAINTER_SCOPE_OPTIONS.map((opt) => {
                        const selected = form.paintingScope === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              update('paintingScope', opt.value);
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
                      Paint Finish / Quality
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {PAINTER_FINISH_OPTIONS.map((opt) => {
                        const selected = form.paintFinish === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              update('paintFinish', opt.value);
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
                      Surface Condition
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {PAINTER_SURFACE_OPTIONS.map((opt) => {
                        const selected = form.surfaceCondition === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              update('surfaceCondition', opt.value);
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
                      Primer Requirement
                    </label>
                    <Select
                      value={form.primerRequirement || undefined}
                      onValueChange={(v) => {
                        update('primerRequirement', v as PainterPrimerRequirement);
                        setStep2Error(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primer coats" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAINTER_PRIMER_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Paint Topcoats
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAINTER_TOPCOAT_OPTIONS.map((opt) => {
                        const selected = form.paintTopcoats === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              update('paintTopcoats', opt);
                              setStep2Error(null);
                            }}
                            className={cn(
                              'rounded-lg border px-3 py-2.5 text-center text-xs font-semibold transition-colors',
                              selected
                                ? 'border-emerald-500/70 bg-emerald-500/10 text-foreground'
                                : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40',
                            )}
                          >
                            {opt}
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
                      {PAINTER_START_TIME_OPTIONS.map((opt) => {
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
                      placeholder="Specify any custom instructions, special paint brands, scaffolding needs, or details not covered above..."
                      value={form.additionalRequirements}
                      onChange={(e) => {
                        update('additionalRequirements', e.target.value);
                        setStep2Error(null);
                      }}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                </div>
              )}

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

          {step === 3 && form.track_type && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Review & Launch Auction</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Service', value: `${tradeEmoji} ${tradeLabel}` },
                  { label: 'Project Title', value: form.title },
                  { label: 'District', value: form.location },
                  { label: 'Pincode', value: form.pincode.trim() || 'Not specified' },
                  {
                    label: 'Building Type',
                    value: BUILDING_TYPE_OPTIONS.find((o) => o.value === form.track_type)?.label,
                  },
                  ...(isPainter && form.projectArea && form.paintingScope && form.paintFinish && form.surfaceCondition && form.primerRequirement && form.paintTopcoats && form.projectStartTimeType
                    ? getPainterWorkRequirementBlocks({
                        projectArea: parseFloat(form.projectArea) || 0,
                        primerRequirement: form.primerRequirement,
                        materialsIncludeClient: null,
                        projectStartTimeType: form.projectStartTimeType,
                        projectStartTimeSpecificDate: form.projectStartTimeSpecificDate || null,
                        paintingScope: form.paintingScope,
                        paintFinish: form.paintFinish,
                        surfaceCondition: form.surfaceCondition,
                        paintTopcoats: form.paintTopcoats,
                        additionalRequirements: form.additionalRequirements.trim() || null,
                      })
                    : []),
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
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground text-right flex-shrink-0 max-w-[55%]">
                      <div className="min-w-0">{value}</div>
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
        </CardContent>
      </Card>
    </div>
  );
}

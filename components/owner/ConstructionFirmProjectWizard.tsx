'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { AssamDistrictSelect } from '@/components/owner/AssamDistrictSelect';
import { FinishingLevelSelector } from '@/components/owner/FinishingLevelSelector';
import { DrawingUploadStep, type DrawingChoice } from '@/components/owner/DrawingUploadStep';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { sortBuildingTypes } from '@/lib/buildingConfig';
import type { BuildingType } from '@/lib/buildingConfig';
import { ASSAM_OTHER } from '@/lib/assamDistricts';
import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import {
  formatBudgetRange,
  formatIndianInputDisplay,
  parseIndianAmount,
} from '@/lib/formatIndianCurrency';
import { uploadProjectDrawing } from '@/lib/project/uploadDrawing';
import { createProjectAction } from '@/app/actions/createProject';
import type { FinishingLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = [
  'Project Info',
  'Type of Building',
  'Finishing Level',
  'Drawing',
  'Review',
] as const;

interface FirmFormState {
  title: string;
  description: string;
  district: string;
  districtOther: string;
  floor_area_sqft: string;
  budget_min: string;
  budget_max: string;
  building_types: BuildingType[];
  finishing_level: FinishingLevel | null;
  drawing_choice: DrawingChoice;
}

const EMPTY_FORM: FirmFormState = {
  title: '',
  description: '',
  district: '',
  districtOther: '',
  floor_area_sqft: '',
  budget_min: '',
  budget_max: '',
  building_types: [],
  finishing_level: null,
  drawing_choice: null,
};

function resolveDistrict(form: FirmFormState): { district: string; state: string } | null {
  if (!form.district) return null;
  if (form.district === ASSAM_OTHER) {
    if (!form.districtOther.trim()) return null;
    return { district: form.districtOther.trim(), state: 'Assam' };
  }
  return { district: form.district, state: 'Assam' };
}

export function ConstructionFirmProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FirmFormState>(EMPTY_FORM);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [biddingEndsAt, setBiddingEndsAt] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  function update<K extends keyof FirmFormState>(key: K, value: FirmFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const districtOk = !!resolveDistrict(form);
  const canStep2 = form.title.trim().length >= 5 && districtOk;
  const budgetPreview = formatBudgetRange(
    parseIndianAmount(form.budget_min),
    parseIndianAmount(form.budget_max),
  );

  const canStep4 = form.finishing_level !== null;
  const canStep5 =
    form.drawing_choice === 'firm_creates' ||
    (form.drawing_choice === 'upload' && !!drawingFile);

  async function handleSubmit() {
    if (!profile || !form.finishing_level) return;
    const loc = resolveDistrict(form);
    if (!loc) return;

    setLoading(true);
    setError(null);

    const result = await createProjectAction({
      service_type: 'construction_firm',
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      building_types: form.building_types,
      district: loc.district,
      state: loc.state,
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
    setStep(6);
    setLoading(false);
  }

  const reviewProject = {
    building_types: form.building_types,
    construction_types: {},
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

      {step < 6 && (
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

              <Input
                label="Project Title *"
                type="text"
                placeholder="e.g. 3BHK Residential Home, Guwahati"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-border bg-card/80 px-3 py-2 text-sm resize-none"
                  placeholder="Any special requirements, preferences, or notes for the construction firm..."
                  value={form.description}
                  maxLength={500}
                  onChange={(e) => update('description', e.target.value.slice(0, 500))}
                />
                <p className="text-[10px] text-muted-foreground text-right">{form.description.length}/500</p>
              </div>

              <AssamDistrictSelect
                value={form.district}
                otherValue={form.districtOther}
                onChange={(v) => update('district', v)}
                onOtherChange={(v) => update('districtOther', v)}
              />

              <div>
                <Input
                  label="Total Floor Area (sqft)"
                  type="number"
                  min={100}
                  max={50000}
                  placeholder="e.g. 1500"
                  value={form.floor_area_sqft}
                  onChange={(e) => update('floor_area_sqft', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Combined area of all floors you want constructed</p>
                <p className="text-[11px] text-indigo-400/70 mt-0.5">Builders will bid in ₹ per sqft based on this</p>
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

              <Button size="lg" className="w-full" disabled={!canStep2} onClick={() => setStep(2)}>
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
                <Button size="lg" className="flex-1" onClick={() => {
                  if (form.building_types.length === 0) {
                    setStep2Error('Please select at least one building type.');
                    return;
                  }
                  setStep(3);
                }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <FinishingLevelSelector
                value={form.finishing_level}
                onChange={(v) => update('finishing_level', v)}
              />
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={!canStep4} onClick={() => setStep(4)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <DrawingUploadStep
                choice={form.drawing_choice}
                onChoiceChange={(c) => update('drawing_choice', c)}
                file={drawingFile}
                onFileChange={setDrawingFile}
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
              <h2 className="text-base font-semibold text-foreground">Review & Submit</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Service Type', value: '🏗️ Construction Firm', editStep: null },
                  { label: 'Project Title', value: form.title, editStep: 1 as Step },
                  { label: 'City', value: resolveDistrict(form)?.district ?? '—', editStep: 1 as Step },
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
                    label: 'Finishing Level',
                    value: finishingCfg ? `${finishingCfg.title} (${finishingCfg.classBadge})` : '—',
                    editStep: 3 as Step,
                  },
                  {
                    label: 'Drawing',
                    value: form.drawing_choice === 'upload' && drawingFile
                      ? `Uploaded: ${drawingFile.name}`
                      : 'Firm will create drawing',
                    editStep: 4 as Step,
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

              <Button variant="outline" size="lg" className="w-full" onClick={() => setStep(4)}>
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

          {step === 6 && (
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

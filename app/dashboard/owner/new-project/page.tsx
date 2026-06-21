'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building, HardHat, ArrowRight, ArrowLeft, CheckCircle2,
  AlertCircle, Info, MapPin
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ASSAM_DISTRICTS, RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS,
  type TrackType, type RCCConfig, type AssamConfig
} from '@/lib/types';

type Step = 1 | 2 | 3 | 4;

interface FormState {
  title: string;
  description: string;
  track_type: TrackType;
  rcc_config: RCCConfig | '';
  assam_config: AssamConfig | '';
  district: string;
  plot_area_sqft: string;
  bidding_hours: string;
}

const RCC_OPTIONS: { value: RCCConfig; label: string; floors: number }[] = [
  { value: 'ground_only',                    label: RCC_CONFIG_LABELS['ground_only'],                    floors: 1 },
  { value: 'g_plus_1_structural',            label: RCC_CONFIG_LABELS['g_plus_1_structural'],            floors: 2 },
  { value: 'g_plus_1_full',                  label: RCC_CONFIG_LABELS['g_plus_1_full'],                  floors: 2 },
  { value: 'g_plus_2_structural_structural', label: RCC_CONFIG_LABELS['g_plus_2_structural_structural'], floors: 3 },
  { value: 'g_plus_2_structural_full',       label: RCC_CONFIG_LABELS['g_plus_2_structural_full'],       floors: 3 },
  { value: 'g_plus_2_full_structural',       label: RCC_CONFIG_LABELS['g_plus_2_full_structural'],       floors: 3 },
  { value: 'g_plus_2_full_full',             label: RCC_CONFIG_LABELS['g_plus_2_full_full'],             floors: 3 },
];

const PERMUTATION_GROUPS = [
  { label: 'Ground Floor Only (1 permutation)', items: RCC_OPTIONS.filter((o) => o.floors === 1) },
  { label: 'G+1 — 2 permutations', items: RCC_OPTIONS.filter((o) => o.floors === 2) },
  { label: 'G+2 — 4 permutations', items: RCC_OPTIONS.filter((o) => o.floors === 3) },
];

export default function NewProjectPage() {
  const router    = useRouter();
  const { profile } = useProfile();
  const [step, setStep]     = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [form, setForm]     = useState<FormState>({
    title: '', description: '', track_type: 'RCC',
    rcc_config: '', assam_config: '', district: '',
    plot_area_sqft: '', bidding_hours: '24',
  });

  const supabase = createClient();
  const update   = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const totalFloors = form.track_type === 'RCC'
    ? RCC_OPTIONS.find((o) => o.value === form.rcc_config)?.floors ?? 1
    : 1;

  async function handleSubmit() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const biddingEndsAt = new Date(Date.now() + parseInt(form.bidding_hours) * 3600 * 1000).toISOString();

    const subConfig = form.track_type === 'RCC'
      ? { rcc_config: form.rcc_config }
      : { assam_config: form.assam_config };

    const { error: insertError } = await supabase.from('projects').insert({
      owner_id:          profile.id,
      title:             form.title.trim(),
      description:       form.description.trim() || null,
      track_type:        form.track_type,
      sub_configuration: subConfig,
      district:          form.district,
      state:             'Assam',
      plot_area_sqft:    form.plot_area_sqft ? parseFloat(form.plot_area_sqft) : null,
      total_floors:      totalFloors,
      status:            'active_24h',
      bidding_ends_at:   biddingEndsAt,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setStep(4);
    setLoading(false);
  }

  const canGoStep2 = form.title.trim() && form.district;
  const canGoStep3 = form.track_type === 'RCC' ? !!form.rcc_config : !!form.assam_config;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Post New Project</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your construction project for the 24-hour bidding auction.</p>
      </div>

      {/* Progress */}
      {step < 4 && (
        <div className="flex items-center gap-2">
          {(['Project Info', 'Track Config', 'Review & Launch'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                i + 1 < step ? 'bg-emerald-500 text-white' :
                i + 1 === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                'bg-slate-800 text-slate-600'
              )}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:block', i + 1 === step ? 'text-white font-semibold' : 'text-slate-500')}>
                {label}
              </span>
              {i < 2 && <div className="h-px flex-1 bg-slate-800 mx-2" />}
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

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-white">Project Information</h2>

              <Input label="Project Title" type="text" placeholder="e.g. 2BHK Residential Construction, Guwahati"
                value={form.title} onChange={(e) => update('title', e.target.value)} required />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description (optional)</label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  placeholder="Additional notes about the project..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">District</label>
                <Select value={form.district} onValueChange={(v) => update('district', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Assam district…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSAM_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Input label="Plot Area (sqft, optional)" type="number" placeholder="e.g. 1500"
                value={form.plot_area_sqft} onChange={(e) => update('plot_area_sqft', e.target.value)}
                prefix={<MapPin className="w-3.5 h-3.5" />} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Bidding Duration</label>
                <Select value={form.bidding_hours} onValueChange={(v) => update('bidding_hours', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 Hours (Standard)</SelectItem>
                    <SelectItem value="48">48 Hours (Extended)</SelectItem>
                    <SelectItem value="72">72 Hours (Long)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button size="lg" className="w-full" disabled={!canGoStep2} onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: Track Configuration */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-white">Construction Track & Configuration</h2>

              {/* Track selection */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  { type: 'RCC' as TrackType, icon: Building, title: 'RCC Construction', desc: 'Reinforced Concrete — Ground, G+1, or G+2' },
                  { type: 'AssamType' as TrackType, icon: HardHat, title: 'Assam Type', desc: 'Traditional Assam-style — Frame or Full Finishing' },
                ] as const).map(({ type, icon: Icon, title, desc }) => (
                  <button
                    key={type}
                    onClick={() => { update('track_type', type); update('rcc_config', ''); update('assam_config', ''); }}
                    className={cn(
                      'text-left p-4 rounded-xl border-2 transition-all',
                      form.track_type === type
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                    )}
                  >
                    <Icon className={cn('w-6 h-6 mb-2', form.track_type === type ? 'text-emerald-400' : 'text-slate-500')} />
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>

              {/* RCC permutation matrix */}
              {form.track_type === 'RCC' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <p className="text-xs text-blue-300">Select the exact floor permutation for your RCC project. Builders will bid per floor based on this configuration.</p>
                  </div>
                  {PERMUTATION_GROUPS.map(({ label, items }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                      <div className="space-y-2">
                        {items.map(({ value, label: itemLabel }) => (
                          <button key={value} onClick={() => update('rcc_config', value)}
                            className={cn(
                              'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all',
                              form.rcc_config === value
                                ? 'border-emerald-500/50 bg-emerald-500/8 text-emerald-300'
                                : 'border-slate-800 bg-slate-800/30 text-slate-300 hover:border-slate-700'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{itemLabel}</span>
                              {form.rcc_config === value && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Assam Type selection */}
              {form.track_type === 'AssamType' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Finishing Level</p>
                  {(Object.entries(ASSAM_CONFIG_LABELS) as [AssamConfig, string][]).map(([value, label]) => (
                    <button key={value} onClick={() => update('assam_config', value)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all',
                        form.assam_config === value
                          ? 'border-emerald-500/50 bg-emerald-500/8 text-emerald-300'
                          : 'border-slate-800 bg-slate-800/30 text-slate-300 hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{label}</span>
                        {form.assam_config === value && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={!canGoStep3} onClick={() => setStep(3)}>
                  Review <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Launch */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-white">Review & Launch Auction</h2>

              <div className="rounded-xl bg-slate-800/50 border border-slate-800 divide-y divide-slate-800">
                {[
                  { label: 'Project Title', value: form.title },
                  { label: 'District', value: form.district },
                  { label: 'Track', value: form.track_type === 'RCC' ? 'RCC Construction' : 'Assam Type' },
                  { label: 'Configuration', value: form.track_type === 'RCC'
                    ? (form.rcc_config ? RCC_CONFIG_LABELS[form.rcc_config as RCCConfig] : '—')
                    : (form.assam_config ? ASSAM_CONFIG_LABELS[form.assam_config as AssamConfig] : '—') },
                  { label: 'Floor Count', value: totalFloors === 1 ? 'Ground Only' : totalFloors === 2 ? 'G+1 (2 floors)' : 'G+2 (3 floors)' },
                  { label: 'Bidding Window', value: `${form.bidding_hours} hours from launch` },
                  ...(form.plot_area_sqft ? [{ label: 'Plot Area', value: `${form.plot_area_sqft} sqft` }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-400">
                  ⚠ Once launched, the auction will run for <strong>{form.bidding_hours} hours</strong>. During this period, builders can submit and update bids. You cannot cancel an active auction.
                </p>
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

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Auction Launched! 🎉</h2>
                <p className="text-sm text-slate-400">
                  Your project <strong className="text-white">"{form.title}"</strong> is now live. Builders will start submitting bids within the next few minutes.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => { setStep(1); setForm({ title: '', description: '', track_type: 'RCC', rcc_config: '', assam_config: '', district: '', plot_area_sqft: '', bidding_hours: '24' }); }}>
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

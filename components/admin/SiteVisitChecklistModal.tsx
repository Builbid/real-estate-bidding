'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ClipboardCheck, Loader2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  goToAgreementAction,
  loadSiteVisitAction,
  saveSiteVisitChecklistAction,
} from '@/app/admin/site-visit-actions';
import {
  EMPTY_SITE_VISIT_INPUT,
  SOIL_TYPES,
  siteVisitToInput,
  type SiteVisitInput,
} from '@/lib/admin/siteVisit';
import {
  computeMeasuredCost,
  computeOwnerEstimate,
  groupMeasurementLines,
  lineAmount,
  type MeasurementTemplate,
} from '@/lib/admin/siteMeasurements';
import { cn } from '@/lib/utils';

const SELECT_CLASS =
  'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100';

const SUB_CARD =
  'rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-700/70 dark:bg-slate-800/40';

const QTY_INPUT_CLASS =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-right text-sm tabular-nums text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

function todayLocalIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function inr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={SUB_CARD}>
      <div className="mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SiteVisitChecklistModal({
  open,
  onOpenChange,
  projectId,
  publicId,
  projectTitle,
  clientName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  publicId?: string;
  projectTitle: string;
  clientName?: string;
  onSaved?: (projectId: string) => void;
}) {
  const router = useRouter();
  // The parent remounts this component per project (key), so state starts fresh each time.
  const [form, setForm] = useState<SiteVisitInput>(() => ({
    ...EMPTY_SITE_VISIT_INPUT,
    visitDate: todayLocalIso(),
  }));
  const [template, setTemplate] = useState<MeasurementTemplate | null>(null);
  const [plinthTouched, setPlinthTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [navigating, startNavigating] = useTransition();

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    loadSiteVisitAction(projectId)
      .then(({ visit, template: loaded, defaultFloors }) => {
        if (cancelled) return;
        setTemplate(loaded);
        if (visit) {
          const input = siteVisitToInput(visit);
          // Keep any measurement line added since the last save pre-filled from the owner's form.
          const measurements = { ...input.measurements };
          for (const line of loaded?.lines ?? []) {
            if (measurements[line.id] == null && line.ownerQuantity != null) {
              measurements[line.id] = String(line.ownerQuantity);
            }
          }
          setForm({ ...input, measurements });
          setPlinthTouched(true);
          setSaved(true);
        } else {
          // Auto-copy the Owner's submitted quantities as the starting point for the real measurements.
          const measurements: Record<string, string> = {};
          for (const line of loaded?.lines ?? []) {
            if (line.ownerQuantity != null) measurements[line.id] = String(line.ownerQuantity);
          }
          setForm((prev) => ({ ...prev, floors: String(defaultFloors), measurements }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  function patch(next: Partial<SiteVisitInput>) {
    setSaved(false);
    setForm((prev) => {
      const merged = { ...prev, ...next };
      if (!plinthTouched && ('plotLengthFt' in next || 'plotWidthFt' in next)) {
        const l = Number(merged.plotLengthFt);
        const w = Number(merged.plotWidthFt);
        merged.plinthAreaSqft = l > 0 && w > 0 ? String(Math.round(l * w)) : '';
      }
      return merged;
    });
  }

  function setMeasurement(id: string, value: string) {
    setSaved(false);
    setForm((prev) => ({ ...prev, measurements: { ...prev.measurements, [id]: value } }));
  }

  const lines = useMemo(() => template?.lines ?? [], [template]);
  const cost = useMemo(() => computeMeasuredCost(lines, form.measurements), [lines, form.measurements]);
  const ownerEstimate = useMemo(() => computeOwnerEstimate(lines), [lines]);
  const groups = useMemo(() => groupMeasurementLines(lines), [lines]);

  async function persist(): Promise<boolean> {
    const result = await saveSiteVisitChecklistAction(projectId, form);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setSaved(true);
    onSaved?.(projectId);
    return true;
  }

  function save() {
    setError(null);
    startSaving(async () => {
      await persist();
    });
  }

  /** Saves the latest measurements first so the agreement is derived from exactly what is on screen. */
  function goToAgreement() {
    setError(null);
    startNavigating(async () => {
      if (!saved && !(await persist())) return;
      const result = await goToAgreementAction(projectId);
      if (result.error || !result.href) {
        setError(result.error ?? 'Could not open the agreement.');
        return;
      }
      router.push(result.href);
    });
  }

  const busy = saving || navigating || loading;
  const needsPlot = template?.needsPlotDimensions ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            Site Visit Checklist
            {template ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                {template.tradeLabel}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {projectTitle}
            {publicId ? ` · Project ID: ${publicId}` : ''}
            {clientName ? ` · Client: ${clientName}` : ''}. Enter the real measurements taken on
            site. They populate the agreement and the total accurate cost.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading project specifications…
          </div>
        ) : (
          <div className="space-y-4">
            <SectionCard title="Visit details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Site Visit Date"
                  accentLabel={false}
                  type="date"
                  max={todayLocalIso()}
                  value={form.visitDate}
                  onChange={(e) => patch({ visitDate: e.target.value })}
                />
                <Input
                  label="Number of Floors"
                  accentLabel={false}
                  type="number"
                  min={1}
                  max={20}
                  inputMode="numeric"
                  value={form.floors}
                  onChange={(e) => patch({ floors: e.target.value })}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                    Soil Condition Observed
                  </label>
                  <select
                    className={SELECT_CLASS}
                    value={form.soilType}
                    onChange={(e) => patch({ soilType: e.target.value })}
                  >
                    <option value="">Select soil condition…</option>
                    {SOIL_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Access Road Width (ft)"
                  accentLabel={false}
                  type="number"
                  min={0}
                  inputMode="decimal"
                  placeholder="e.g. 12"
                  value={form.roadWidthFt}
                  onChange={(e) => patch({ roadWidthFt: e.target.value })}
                />
              </div>
            </SectionCard>

            {needsPlot ? (
              <SectionCard
                title="Plot & plinth measurements"
                hint="Civil / Mistri work: the plinth area auto-fills from length × width until you edit it."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    label="Plot Length (ft)"
                    accentLabel={false}
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="e.g. 40"
                    value={form.plotLengthFt}
                    onChange={(e) => patch({ plotLengthFt: e.target.value })}
                  />
                  <Input
                    label="Plot Width (ft)"
                    accentLabel={false}
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="e.g. 30"
                    value={form.plotWidthFt}
                    onChange={(e) => patch({ plotWidthFt: e.target.value })}
                  />
                  <Input
                    label="Measured Plinth Area (sq. ft.)"
                    accentLabel={false}
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="e.g. 1000"
                    value={form.plinthAreaSqft}
                    onChange={(e) => {
                      setPlinthTouched(true);
                      patch({ plinthAreaSqft: e.target.value });
                    }}
                  />
                </div>
              </SectionCard>
            ) : null}

            {template && template.ownerSpecs.length > 0 ? (
              <SectionCard
                title={`Owner's submitted ${template.tradeLabel.toLowerCase()} specs`}
                hint="Copied exactly from the project form the owner submitted."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {template.ownerSpecs.map((spec) => (
                    <div
                      key={`${spec.label}-${spec.value}`}
                      className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {spec.label}
                      </p>
                      <p className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {groups.length > 0 ? (
              <>
                {groups.map((group) => (
                  <SectionCard
                    key={group.group}
                    title={group.group}
                    hint="Enter the actual measured quantity; use 0 if it is not part of the work."
                  >
                    <div className="space-y-2.5">
                      {group.lines.map((line) => {
                        const raw = form.measurements[line.id] ?? '';
                        const qty = Number(raw.replace(/,/g, ''));
                        const amount = raw.trim() !== '' && Number.isFinite(qty) ? lineAmount(line, qty) : 0;
                        return (
                          <div
                            key={line.id}
                            className="grid items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/50 sm:grid-cols-[1fr_150px_120px]"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {line.label}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Agreed rate {inr(line.rate)}
                                {line.rateMultiplier ? ` × ${line.rateMultiplier}` : ''} / {line.unit}
                                {line.ownerQuantity != null
                                  ? ` · Owner stated ${line.ownerQuantity.toLocaleString('en-IN')} ${line.unit}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                inputMode="decimal"
                                aria-label={`${line.label} measured quantity (${line.unit})`}
                                className={QTY_INPUT_CLASS}
                                placeholder="0"
                                value={raw}
                                onChange={(e) => setMeasurement(line.id, e.target.value)}
                              />
                              <span className="w-12 shrink-0 text-[11px] text-slate-500">{line.unit}</span>
                            </div>
                            <p className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                              {inr(amount)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                ))}

                <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-100">
                        Total Accurate Cost
                      </p>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/70">
                        Σ measured quantity × agreed rate
                        {cost.missing.length > 0 ? ` · ${cost.missing.length} line(s) still to measure` : ''}
                      </p>
                    </div>
                    <p className="text-2xl font-extrabold tabular-nums text-emerald-800 dark:text-emerald-200">
                      {inr(cost.total)}
                    </p>
                  </div>
                  {template?.agreedBidTotal != null || ownerEstimate != null ? (
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-emerald-900/80 dark:text-emerald-100/70">
                      {template?.agreedBidTotal != null ? (
                        <span>Accepted bid: {inr(template.agreedBidTotal)}</span>
                      ) : null}
                      {ownerEstimate != null ? (
                        <span>At owner-stated quantities: {inr(ownerEstimate)}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <SectionCard title="Measured quantities">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No itemised rates were found on the accepted bid, so the agreement will use the
                  accepted bid amount as the total cost.
                </p>
              </SectionCard>
            )}

            <SectionCard title="Site facilities & field notes">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                {(
                  [
                    ['waterAvailable', 'Water available'],
                    ['electricityAvailable', 'Electricity available'],
                    ['storageAvailable', 'Material storage space'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      checked={form[key]}
                      onChange={(e) => patch({ [key]: e.target.checked } as Partial<SiteVisitInput>)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                  Field Notes (optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                  placeholder="Boundary issues, existing structure, drainage, neighbouring buildings…"
                  value={form.siteNotes}
                  onChange={(e) => patch({ siteNotes: e.target.value })}
                />
              </div>
            </SectionCard>

            {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
            {saved ? (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Checklist saved. Go to Agreement opens the agreement pre-filled from these measurements.
              </p>
            ) : null}

            <div className={cn('flex flex-col gap-2 sm:flex-row')}>
              <Button
                type="button"
                variant={saved ? 'outline' : 'default'}
                className="sm:flex-1"
                onClick={save}
                disabled={busy}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : saved ? 'Update Checklist' : 'Save Checklist'}
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:flex-1"
                onClick={goToAgreement}
                disabled={busy}
              >
                {navigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Go to Agreement
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

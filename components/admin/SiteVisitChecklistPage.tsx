'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  goToAgreementAction,
  loadSiteVisitAction,
  saveSiteVisitChecklistAction,
  type ChecklistProjectSummary,
} from '@/app/admin/site-visit-actions';
import {
  EMPTY_SITE_VISIT_INPUT,
  SOIL_TYPES,
  canonicalSoilType,
  siteVisitToInput,
  type SiteVisitInput,
} from '@/lib/admin/siteVisit';
import {
  computeMeasuredCost,
  effectiveUnitRate,
  groupMeasurementLines,
  lineAmount,
  type MeasurementLine,
  type MeasurementTemplate,
} from '@/lib/admin/siteMeasurements';

const SELECT_CLASS =
  'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100';

const QTY_INPUT_CLASS =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-right text-sm tabular-nums text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

function todayIstIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatDmY(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const DRAFT_PREFIX = 'builbid-site-checklist:';

interface ChecklistDraft {
  soilType: string;
  measurements: Record<string, string>;
  siteNotes: string;
  plotLengthFt: string;
  plotWidthFt: string;
  plinthAreaSqft: string;
}

function draftKey(projectId: string): string {
  return `${DRAFT_PREFIX}${projectId}`;
}

function readDraft(projectId: string): ChecklistDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChecklistDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      soilType: typeof parsed.soilType === 'string' ? parsed.soilType : '',
      measurements:
        parsed.measurements && typeof parsed.measurements === 'object' ? parsed.measurements : {},
      siteNotes: typeof parsed.siteNotes === 'string' ? parsed.siteNotes : '',
      plotLengthFt: typeof parsed.plotLengthFt === 'string' ? parsed.plotLengthFt : '',
      plotWidthFt: typeof parsed.plotWidthFt === 'string' ? parsed.plotWidthFt : '',
      plinthAreaSqft: typeof parsed.plinthAreaSqft === 'string' ? parsed.plinthAreaSqft : '',
    };
  } catch {
    return null;
  }
}

function knownSoil(value: string): string {
  return canonicalSoilType(value);
}

function inr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function lineFloorSteps(line: MeasurementLine): number {
  if (line.floorSteps != null) return line.floorSteps;
  if (line.rateMultiplier && line.rateMultiplier > 1) {
    return Math.max(0, Math.round((line.rateMultiplier - 1) / 0.05));
  }
  return 0;
}

function rateCaption(line: MeasurementLine): string {
  const steps = lineFloorSteps(line);
  const amount = `${inr(effectiveUnitRate(line))} / ${line.unit}`;
  if (steps <= 0) return `Base rate ${amount}`;
  return `+${steps * 5}% Surcharge = ${amount}`;
}

function measuredAmount(line: MeasurementLine, raw: string): number {
  if (raw.trim() === '') return 0;
  const qty = Number(raw.replace(/,/g, ''));
  return Number.isFinite(qty) ? lineAmount(line, qty) : 0;
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
    <section className="rounded-xl border border-slate-200/80 px-4 py-4 dark:border-slate-700/70">
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

export function SiteVisitChecklistPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<SiteVisitInput>(() => ({
    ...EMPTY_SITE_VISIT_INPUT,
    visitDate: todayIstIso(),
  }));
  const [template, setTemplate] = useState<MeasurementTemplate | null>(null);
  const [project, setProject] = useState<ChecklistProjectSummary | null>(null);
  const [plinthTouched, setPlinthTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, startSaving] = useTransition();
  const [opening, startOpening] = useTransition();
  const readyRef = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const writeDraft = useCallback((next: SiteVisitInput) => {
    if (!readyRef.current) return;
    try {
      const draft: ChecklistDraft = {
        soilType: next.soilType,
        measurements: next.measurements,
        siteNotes: next.siteNotes,
        plotLengthFt: next.plotLengthFt,
        plotWidthFt: next.plotWidthFt,
        plinthAreaSqft: next.plinthAreaSqft,
      };
      window.localStorage.setItem(draftKey(projectId), JSON.stringify(draft));
    } catch {
      // Private browsing can block storage; the explicit save still persists to the server.
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    loadSiteVisitAction(projectId)
      .then(({ visit, template: loaded, defaultFloors, error: actionError, project: summary }) => {
        if (cancelled) return;
        setProject(summary);
        setTemplate(loaded);
        if (actionError) {
          setLoadError(actionError);
          return;
        }
        const draft = readDraft(projectId);
        const today = todayIstIso();
        if (visit && !draft) {
          const input = siteVisitToInput(visit);
          setForm({
            ...input,
            visitDate: today,
            floors: String(visit.floors > 0 ? visit.floors : defaultFloors),
            roadWidthFt: '',
            waterAvailable: false,
            electricityAvailable: false,
            storageAvailable: false,
            soilType: knownSoil(input.soilType),
            measurements: {},
          });
          setPlinthTouched(input.plinthAreaSqft.trim() !== '');
        } else {
          setForm({
            ...EMPTY_SITE_VISIT_INPUT,
            visitDate: today,
            floors: String(visit && visit.floors > 0 ? visit.floors : defaultFloors),
            soilType: knownSoil(draft?.soilType ?? ''),
            siteNotes: draft?.siteNotes ?? '',
            plotLengthFt: draft?.plotLengthFt ?? '',
            plotWidthFt: draft?.plotWidthFt ?? '',
            plinthAreaSqft: draft?.plinthAreaSqft ?? '',
            measurements: {},
          });
          setPlinthTouched((draft?.plinthAreaSqft ?? '').trim() !== '');
        }
        readyRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const flush = () => writeDraft(formRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [writeDraft]);

  function patch(next: Partial<SiteVisitInput>) {
    setSavedNotice(false);
    setForm((prev) => {
      const merged = { ...prev, ...next, visitDate: todayIstIso() };
      if (!plinthTouched && ('plotLengthFt' in next || 'plotWidthFt' in next)) {
        const length = Number(merged.plotLengthFt);
        const width = Number(merged.plotWidthFt);
        merged.plinthAreaSqft = length > 0 && width > 0 ? String(Math.round(length * width)) : '';
      }
      writeDraft(merged);
      return merged;
    });
  }

  function setMeasurement(id: string, value: string) {
    setSavedNotice(false);
    setForm((prev) => {
      const merged = {
        ...prev,
        visitDate: todayIstIso(),
        measurements: { ...prev.measurements, [id]: value },
      };
      writeDraft(merged);
      return merged;
    });
  }

  function payload(): SiteVisitInput {
    return {
      ...formRef.current,
      visitDate: todayIstIso(),
      waterAvailable: false,
      electricityAvailable: false,
      storageAvailable: false,
    };
  }

  const lines = useMemo(() => template?.lines ?? [], [template]);
  const cost = useMemo(() => computeMeasuredCost(lines, form.measurements), [lines, form.measurements]);
  const groups = useMemo(() => groupMeasurementLines(lines), [lines]);
  const needsPlot = template?.needsPlotDimensions ?? false;

  const floorSubtotals = useMemo(
    () =>
      groups.map((group) => ({
        group: group.group,
        subtotal: group.lines.reduce(
          (sum, line) => sum + measuredAmount(line, form.measurements[line.id] ?? ''),
          0,
        ),
      })),
    [groups, form.measurements],
  );

  function saveChecklist() {
    setError(null);
    setSavedNotice(false);
    startSaving(async () => {
      const saved = await saveSiteVisitChecklistAction(projectId, payload());
      if (saved.error) {
        setError(saved.error);
        return;
      }
      writeDraft(formRef.current);
      setSavedNotice(true);
      toast.success('Checklist saved.');
    });
  }

  function goToAgreement() {
    setError(null);
    startOpening(async () => {
      const saved = await saveSiteVisitChecklistAction(projectId, payload());
      if (saved.error) {
        setError(saved.error);
        return;
      }
      writeDraft(formRef.current);
      const result = await goToAgreementAction(projectId);
      if (result.error || !result.href) {
        setError(result.error ?? 'Could not open the agreement.');
        return;
      }
      router.push(result.href);
    });
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" richColors closeButton />
      <header className="border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex w-full max-w-[800px] items-center justify-between gap-3">
          <Link href="/" aria-label="BuilBid home" className="rounded-lg p-1 transition hover:opacity-80">
            <BuilBidLogo size="sm" />
          </Link>
          <Link
            href="/admin/dashboard?tab=agreements"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] space-y-4 px-4 py-6">
        <section className="rounded-2xl border border-slate-200/80 px-5 py-4 dark:border-slate-700/70">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Site visit checklist</p>
            {template ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                {template.tradeLabel}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-xl font-bold leading-snug text-slate-900 dark:text-slate-100">
            {project?.title ?? 'Project'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {[
              project?.publicId ? `Project ID: ${project.publicId}` : null,
              project?.clientName ? `Client: ${project.clientName}` : null,
              project?.district || null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Measured quantities and the locked bid rates'}
          </p>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading project specifications…
          </div>
        ) : loadError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        ) : (
          <div className="space-y-4">
            <SectionCard title="Visit details">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                    Site Visit Date
                  </label>
                  <input
                    readOnly
                    aria-readonly="true"
                    aria-label="Site Visit Date"
                    value={formatDmY(form.visitDate || todayIstIso())}
                    className={`${SELECT_CLASS} cursor-default bg-slate-50 dark:bg-slate-900/40`}
                  />
                </div>
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
                    {SOIL_TYPES.map((soil) => (
                      <option key={soil.value} value={soil.value}>
                        {soil.label}
                      </option>
                    ))}
                  </select>
                </div>
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

            {groups.length > 0 ? (
              <>
                <p className="text-xs leading-relaxed text-slate-500">
                  Rates are locked from the accepted bid. Enter the quantity measured on site for each item.
                </p>
                {groups.map((group) => {
                  const subtotal = floorSubtotals.find((row) => row.group === group.group)?.subtotal ?? 0;
                  return (
                    <SectionCard key={group.group} title={group.group}>
                      <div className="space-y-2.5">
                        {group.lines.map((line) => {
                          const raw = form.measurements[line.id] ?? '';
                          const amount = measuredAmount(line, raw);
                          return (
                            <div
                              key={line.id}
                              className="grid items-center gap-3 rounded-lg border border-slate-200/70 px-3 py-2.5 dark:border-slate-700/60 sm:grid-cols-[1fr_150px_120px]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {line.label}
                                </p>
                                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                                  {rateCaption(line)}
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
                                  value={raw}
                                  onChange={(e) => setMeasurement(line.id, e.target.value)}
                                />
                                <span className="w-10 shrink-0 text-[11px] text-slate-500">{line.unit}</span>
                              </div>
                              <p className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                {inr(amount)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-700">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          {group.group} subtotal
                        </p>
                        <p className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {inr(subtotal)}
                        </p>
                      </div>
                    </SectionCard>
                  );
                })}

                <div className="rounded-xl border border-emerald-300/70 px-4 py-4 dark:border-emerald-900">
                  <div className="space-y-1.5">
                    {floorSubtotals.map((row) => (
                      <div key={row.group} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          {row.group} subtotal
                        </span>
                        <span className="font-semibold tabular-nums">{inr(row.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-300/60 pt-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-100">
                        Grand Total Accurate Cost
                      </p>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/70">
                        {cost.missing.length > 0
                          ? `${cost.missing.length} line(s) still to measure`
                          : 'Updates as measured quantities change'}
                      </p>
                    </div>
                    <p className="text-2xl font-extrabold tabular-nums text-emerald-800 dark:text-emerald-200">
                      {inr(cost.total)}
                    </p>
                  </div>
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

            <SectionCard title="Field notes">
              <textarea
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                placeholder="Boundary issues, existing structure, drainage, neighbouring buildings…"
                value={form.siteNotes}
                onChange={(e) => patch({ siteNotes: e.target.value })}
              />
            </SectionCard>

            {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
            {savedNotice ? (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Checklist saved.
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="sm:flex-1"
                onClick={saveChecklist}
                disabled={saving || opening}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save Checklist'}
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:flex-1"
                onClick={goToAgreement}
                disabled={saving || opening}
              >
                {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {opening ? 'Opening…' : 'Go to Agreement'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

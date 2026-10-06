'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatIndianDateInput, isoToIndianDate, parseIndianDateToIso } from '@/lib/projectStartTime';
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
  agreedStartDate: string;
  targetCompletionDate: string;
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
      agreedStartDate: typeof parsed.agreedStartDate === 'string' ? parsed.agreedStartDate : '',
      targetCompletionDate: typeof parsed.targetCompletionDate === 'string' ? parsed.targetCompletionDate : '',
    };
  } catch {
    return null;
  }
}

function knownSoil(value: string): string {
  return canonicalSoilType(value);
}

function specValue(template: MeasurementTemplate | null, labels: string[]): string {
  const specs = template?.ownerSpecs ?? [];
  for (const label of labels) {
    const match = specs.find((spec) => spec.label.toLowerCase() === label.toLowerCase());
    const value = match?.value.trim();
    if (value) return value;
  }
  return '';
}

function displayFitting(raw: string): string {
  if (!raw) return '—';
  if (/open surface/i.test(raw)) return 'Non-Concealed Fitting';
  return raw;
}

function displayFloors(raw: string): string {
  if (!raw) return '—';
  return raw.replace(/\bRCC\s+/g, '');
}

function displayLocation(template: MeasurementTemplate | null, district: string): string {
  const parts = [
    specValue(template, ['Project Address']),
    specValue(template, ['Village / Town Name']),
    district.trim(),
  ].filter(Boolean);
  return parts.join(', ') || '—';
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

function CompactChecklistDateField({
  label,
  value,
  onChange,
  minIso,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minIso?: string;
}) {
  const [text, setText] = useState(() => isoToIndianDate(value));
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setText(isoToIndianDate(value));
  }, [value]);

  function commitText(raw: string) {
    const formatted = formatIndianDateInput(raw, text);
    setText(formatted);
    if (!formatted) {
      setFieldError(null);
      onChange('');
      return;
    }
    if (formatted.length < 10) {
      setFieldError(null);
      return;
    }
    const iso = parseIndianDateToIso(formatted);
    if (!iso) {
      setFieldError('Enter a real date as DD/MM/YYYY.');
      return;
    }
    if (minIso && iso < minIso) {
      setFieldError('This date cannot be earlier than the start date.');
    } else {
      setFieldError(null);
    }
    onChange(iso);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          aria-label={label}
          value={text}
          onChange={(event) => commitText(event.target.value)}
          className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300">
          <Calendar className="h-4 w-4" aria-hidden />
        </span>
        <input
          type="date"
          aria-label={`${label} calendar`}
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
          min={minIso || undefined}
          onChange={(event) => {
            const iso = event.target.value;
            setText(isoToIndianDate(iso));
            setFieldError(
              minIso && iso && iso < minIso ? 'This date cannot be earlier than the start date.' : null,
            );
            onChange(iso);
          }}
          className="absolute right-1 top-1/2 h-7 w-8 -translate-y-1/2 cursor-pointer opacity-0"
        />
      </div>
      {fieldError ? <p className="text-xs text-red-600 dark:text-red-400">{fieldError}</p> : null}
    </div>
  );
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
  const templateRef = useRef(template);
  formRef.current = form;
  templateRef.current = template;

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
        agreedStartDate: next.agreedStartDate,
        targetCompletionDate: next.targetCompletionDate,
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
        const saved = visit ? siteVisitToInput(visit) : null;
        setForm({
          ...EMPTY_SITE_VISIT_INPUT,
          ...(saved ?? {}),
          visitDate: today,
          floors: String(visit && visit.floors > 0 ? visit.floors : defaultFloors),
          roadWidthFt: '',
          waterAvailable: false,
          electricityAvailable: false,
          storageAvailable: false,
          soilType: knownSoil(draft?.soilType || saved?.soilType || ''),
          siteNotes: draft?.siteNotes ?? saved?.siteNotes ?? '',
          plotLengthFt: draft?.plotLengthFt ?? saved?.plotLengthFt ?? '',
          plotWidthFt: draft?.plotWidthFt ?? saved?.plotWidthFt ?? '',
          plinthAreaSqft: draft?.plinthAreaSqft ?? saved?.plinthAreaSqft ?? '',
          agreedStartDate: draft?.agreedStartDate || saved?.agreedStartDate || '',
          targetCompletionDate: draft?.targetCompletionDate || saved?.targetCompletionDate || '',
          measurements: {
            ...(saved?.measurements ?? {}),
            ...(draft?.measurements ?? {}),
          },
        });
        setPlinthTouched((draft?.plinthAreaSqft ?? saved?.plinthAreaSqft ?? '').trim() !== '');
        readyRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const persistToServer = useCallback((source: SiteVisitInput) => {
    if (!readyRef.current) return;
    const civil = templateRef.current?.tradeKey === 'civil';
    if (civil && !knownSoil(source.soilType)) return;
    void saveSiteVisitChecklistAction(projectId, {
      ...source,
      visitDate: todayIstIso(),
      soilType: civil ? knownSoil(source.soilType) : '',
      waterAvailable: false,
      electricityAvailable: false,
      storageAvailable: false,
    });
  }, [projectId]);

  useEffect(() => {
    if (loading || !readyRef.current) return;
    const timer = window.setTimeout(() => persistToServer(formRef.current), 500);
    return () => window.clearTimeout(timer);
  }, [form, loading, persistToServer]);

  useEffect(() => {
    const flush = () => {
      writeDraft(formRef.current);
      persistToServer(formRef.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [writeDraft, persistToServer]);

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
    const civil = templateRef.current?.tradeKey === 'civil';
    return {
      ...formRef.current,
      visitDate: todayIstIso(),
      soilType: civil ? knownSoil(formRef.current.soilType) : '',
      waterAvailable: false,
      electricityAvailable: false,
      storageAvailable: false,
    };
  }

  const isCivil = template?.tradeKey === 'civil';
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
    if (!form.agreedStartDate || !form.targetCompletionDate) {
      setError('Enter the agreed start date and the target completion date agreed with the homeowner and the mistri.');
      return;
    }
    if (form.targetCompletionDate < form.agreedStartDate) {
      setError('Target completion date must be on or after the agreed start date.');
      return;
    }
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
      writeDraft(formRef.current);
      await saveSiteVisitChecklistAction(projectId, payload());
      const result = await goToAgreementAction(projectId);
      if (result.href) {
        router.push(result.href);
        return;
      }
      setError(result.error ?? 'Could not open the agreement.');
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
            onClick={() => {
              writeDraft(formRef.current);
              persistToServer(formRef.current);
            }}
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
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {template && (template.tradeKey === 'plumber' || template.tradeKey === 'electrician') ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Fitting Type
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {displayFitting(specValue(template, ['Fitting Type', 'Wiring Type']))}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Target Work Floors
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {displayFloors(specValue(template, ['Target Work Floor', 'Target Work Floors']))}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Location / Site Area
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {displayLocation(template, project?.district ?? '')}
                </dd>
              </div>
            </dl>
          ) : null}
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
              <div className={isCivil ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                    Site Visit Date
                  </label>
                  <input
                    readOnly
                    aria-readonly="true"
                    aria-label="Site Visit Date"
                    value={formatDmY(form.visitDate || todayIstIso())}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-100"
                  />
                </div>
                {isCivil ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                      Soil Condition Observed
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Agreed timelines"
              hint="Type DD/MM/YYYY or open the calendar. These dates fill Section 4 of the agreement."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactChecklistDateField
                  label="Agreed Start Date"
                  value={form.agreedStartDate}
                  onChange={(value) => patch({ agreedStartDate: value })}
                />
                <CompactChecklistDateField
                  label="Target Completion Date"
                  value={form.targetCompletionDate}
                  onChange={(value) => patch({ targetCompletionDate: value })}
                  minIso={form.agreedStartDate || undefined}
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

            {groups.length > 0 ? (
              <>
                <p className="text-xs leading-relaxed text-slate-500">
                  Items and base rates come from the accepted bid and stay locked. Enter only the quantity measured on site. Blank quantities count as zero. Upper floors add +5% on the 1st floor and +10% on the 2nd.
                </p>
                {groups.map((group) => {
                  const subtotal = floorSubtotals.find((row) => row.group === group.group)?.subtotal ?? 0;
                  const surchargeSteps = Math.max(0, ...group.lines.map(lineFloorSteps));
                  return (
                    <SectionCard
                      key={group.group}
                      title={group.group}
                      hint={
                        surchargeSteps > 0
                          ? `+${surchargeSteps * 5}% floor surcharge is applied to the locked base rate`
                          : undefined
                      }
                    >
                      <div className="space-y-2.5">
                        {group.lines.map((line) => {
                          const raw = form.measurements[line.id] ?? '';
                          const amount = measuredAmount(line, raw);
                          return (
                            <div
                              key={line.id}
                              className="grid items-end gap-3 rounded-lg border border-slate-200/70 px-3 py-2.5 dark:border-slate-700/60 sm:grid-cols-[minmax(0,1.3fr)_10.5rem_8.5rem_6.5rem]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {line.label}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {rateCaption(line)}
                                </p>
                              </div>
                              <label className="block min-w-0">
                                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Base rate
                                </span>
                                <input
                                  readOnly
                                  tabIndex={-1}
                                  aria-readonly="true"
                                  aria-label={`${line.label} locked base rate`}
                                  value={`${inr(line.rate)} / ${line.unit}`}
                                  className="h-9 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-2 text-sm font-semibold tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                              </label>
                              <label className="block min-w-0">
                                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Measured qty
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  inputMode="decimal"
                                  placeholder="0"
                                  aria-label={`${line.label} measured quantity (${line.unit})`}
                                  className={QTY_INPUT_CLASS}
                                  value={raw}
                                  onChange={(e) => setMeasurement(line.id, e.target.value)}
                                />
                              </label>
                              <p className="pb-2 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
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
                        Empty quantities count as zero
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

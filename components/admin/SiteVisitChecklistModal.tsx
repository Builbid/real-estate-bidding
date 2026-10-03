'use client';

import { useEffect, useState, useTransition } from 'react';
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

const SELECT_CLASS =
  'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100';

function todayLocalIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
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
      .then(({ visit }) => {
        if (cancelled) return;
        if (visit) {
          setForm(siteVisitToInput(visit));
          setPlinthTouched(true);
          setSaved(true);
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

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveSiteVisitChecklistAction(projectId, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      onSaved?.(projectId);
    });
  }

  function goToAgreement() {
    setError(null);
    startNavigating(async () => {
      const result = await goToAgreementAction(projectId);
      if (result.error || !result.href) {
        setError(result.error ?? 'Could not open the agreement.');
        return;
      }
      router.push(result.href);
    });
  }

  const busy = saving || navigating || loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            Site Visit Checklist
          </DialogTitle>
          <DialogDescription>
            {projectTitle}
            {publicId ? ` · Project ID: ${publicId}` : ''}
            {clientName ? ` · Client: ${clientName}` : ''}. Enter the real measurements taken on
            site. They populate the agreement and the Mistri Thumb Rule sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <fieldset className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 sm:grid-cols-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Site facilities
            </legend>
            {(
              [
                ['waterAvailable', 'Water available'],
                ['electricityAvailable', 'Electricity available'],
                ['storageAvailable', 'Material storage space'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  checked={form[key]}
                  onChange={(e) => patch({ [key]: e.target.checked } as Partial<SiteVisitInput>)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1.5">
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

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          {saved ? (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Checklist saved. You can now continue to the agreement.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
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
            {saved ? (
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-1"
                onClick={goToAgreement}
                disabled={busy}
              >
                {navigating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Go to Agreement
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

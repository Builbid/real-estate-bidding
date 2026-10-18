import { BadgeCheck } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { FloorScopeBadges } from '@/components/project/FloorScopeBadges';
import { getProjectServiceBadgeLabel } from '@/lib/project/display';
import {
  formatFloorSummary,
  getProjectLocationLabel,
} from '@/lib/project/formatFloorSummary';
import { groupMeasurementLines, type MeasuredLineItem } from '@/lib/admin/siteMeasurements';
import { formatProjectPostedAt } from '@/lib/utils';
import type { Project } from '@/lib/types';

export interface SelectedWorkerProfile {
  id: string;
  name: string;
  isVerified: boolean;
}

export interface SelectedProjectFacts {
  status: 'Approved / Active' | 'Completed';
  plinthAreaSqft: number | null;
  soilLabel: string | null;
  startDate: string | null;
  completionDate: string | null;
  totalCost: number | null;
  lineItems: MeasuredLineItem[];
  agreedRates: Array<{ label: string; value: string }>;
}

function inr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function dmy(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

export function SelectedProjectCard({
  project,
  worker,
  facts,
}: {
  project: Project;
  worker: SelectedWorkerProfile | null;
  facts: SelectedProjectFacts;
}) {
  const location = getProjectLocationLabel(project);
  const floors = formatFloorSummary(project);
  const posted = formatProjectPostedAt(project.created_at);
  const completed = facts.status === 'Completed';
  const groups = groupMeasurementLines(facts.lineItems);
  const meta = [
    facts.plinthAreaSqft ? ['Plinth area', `${facts.plinthAreaSqft.toLocaleString('en-IN')} sq. ft.`] : null,
    facts.soilLabel ? ['Soil condition', facts.soilLabel] : null,
    facts.startDate ? ['Start date', dmy(facts.startDate)] : null,
    facts.completionDate ? ['Target completion', dmy(facts.completionDate)] : null,
  ].filter((row): row is [string, string] => row != null);

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {getProjectServiceBadgeLabel(project)}
            {posted ? <span className="font-normal text-muted-foreground"> · Posted {posted}</span> : null}
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">{project.title}</h2>
          {location ? <p className="mt-1 text-sm text-muted-foreground">{location}</p> : null}
        </div>
        <span
          className={
            completed
              ? 'inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
              : 'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
          }
        >
          {facts.status}
        </span>
      </div>

      {floors.length > 0 ? <FloorScopeBadges items={floors} className="mt-3" variant="plain" /> : null}

      {meta.length > 0 ? (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          {meta.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {groups.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Agreed rates and measured quantities
          </p>
          {groups.map((group) => (
            <div key={group.group}>
              <p className="mb-1 text-[11px] font-semibold text-foreground">{group.group}</p>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-border/60">
                  {group.lines.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-2 text-foreground">{item.label}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                        {item.quantity.toLocaleString('en-IN')} {item.unit}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">
                        {inr(item.rate)}
                        {item.rateMultiplier ? ` × ${item.rateMultiplier}` : ''}
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{inr(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : facts.agreedRates.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Agreed rates</p>
          <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            {facts.agreedRates.map((rate) => (
              <div key={rate.label} className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2">
                <dt className="text-muted-foreground">{rate.label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{rate.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {facts.totalCost != null ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wide text-foreground">Total cost</span>
          <span className="text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-300">
            {inr(facts.totalCost)}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex min-w-0 items-center gap-3 border-t border-border/70 pt-3">
        <UserAvatar name={worker?.name ?? 'Worker'} size="sm" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Selected worker
          </p>
          <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
            {worker?.name ?? 'Worker'}
            {worker?.isVerified ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> : null}
          </p>
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { FloorScopeBadges } from '@/components/project/FloorScopeBadges';
import { getProjectServiceBadgeLabel } from '@/lib/project/display';
import {
  formatFloorSummary,
  getProjectLocationLabel,
} from '@/lib/project/formatFloorSummary';
import { ownerAgreementStatusLabel } from '@/lib/dashboard/completedProjects';
import { formatProjectPostedAt } from '@/lib/utils';
import type { Project } from '@/lib/types';

export interface SelectedWorkerProfile {
  id: string;
  name: string;
  isVerified: boolean;
}

export function SelectedProjectCard({
  project,
  worker,
}: {
  project: Project;
  worker: SelectedWorkerProfile | null;
}) {
  const agreementStatus = ownerAgreementStatusLabel(project);
  const approved = agreementStatus === 'Approved / Active';
  const location = getProjectLocationLabel(project);
  const floors = formatFloorSummary(project);
  const posted = formatProjectPostedAt(project.created_at);

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {getProjectServiceBadgeLabel(project)}
            {posted ? <span className="font-normal text-muted-foreground"> · Posted {posted}</span> : null}
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-foreground">{project.title}</h2>
          {location ? <p className="mt-1 text-sm text-muted-foreground">{location}</p> : null}
        </div>
        <span
          className={
            approved
              ? 'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          }
        >
          {agreementStatus}
        </span>
      </div>

      {floors.length > 0 ? <FloorScopeBadges items={floors} className="mt-3" variant="plain" /> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
        <div className="flex min-w-0 items-center gap-3">
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
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/owner/project/${project.id}`}>
            View <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

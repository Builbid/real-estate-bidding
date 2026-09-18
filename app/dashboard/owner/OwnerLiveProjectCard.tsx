'use client';

import { Lock, Users, CalendarDays } from 'lucide-react';
import { AuctionCountdown } from './AuctionCountdown';
import { DeleteProjectButton } from './DeleteProjectButton';
import { UnifiedBidRankings } from './project/[id]/UnifiedBidRankings';
import { UnifiedFirmBidRankings } from './project/[id]/UnifiedFirmBidRankings';
import { OwnerProjectPhaseProvider, useOwnerProjectPhaseContext } from '@/lib/context/OwnerProjectPhaseContext';
import { cn, formatProjectPostedAt } from '@/lib/utils';
import {
  getProjectServiceBadgeLabel,
  isFirmProject,
} from '@/lib/project/display';
import {
  formatFloorSummary,
  getProjectBuildingTypeLabel,
  getProjectBuiltUpAreaLabel,
  getProjectLocationLabel,
} from '@/lib/project/formatFloorSummary';
import { FloorScopeBadges } from '@/components/project/FloorScopeBadges';
import { Badge } from '@/components/ui/badge';
import type { Project, Bid, PublicFirmProfile } from '@/lib/types';

interface BuilderInfo {
  id: string;
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface OwnerLiveProjectCardProps {
  project: Project;
  bidCount: number;
  initialBids: Bid[];
  initialBuilders: Record<string, BuilderInfo>;
  initialFirms?: Record<string, PublicFirmProfile>;
  userId: string;
  priority?: boolean;
}

function OwnerLiveProjectCardBody({
  bidCount,
  initialBids,
  initialBuilders,
  initialFirms = {},
  userId,
}: OwnerLiveProjectCardProps) {
  const { project, phase, canSelect } = useOwnerProjectPhaseContext();
  const isFirm = isFirmProject(project);
  const serviceBadge = getProjectServiceBadgeLabel(project);
  const postedAt = formatProjectPostedAt(project.created_at);
  const locationLabel = getProjectLocationLabel(project);
  const buildingTypeLabel = getProjectBuildingTypeLabel(project);
  const builtUpLabel = getProjectBuiltUpAreaLabel(project);
  const floorScopes = formatFloorSummary(project);

  const metaParts = [
    locationLabel || null,
    buildingTypeLabel,
    builtUpLabel,
    `${bidCount} bid${bidCount !== 1 ? 's' : ''}`,
  ].filter(Boolean) as string[];

  const statusLabel = canSelect
    ? isFirm
      ? 'Select Firm'
      : 'Select Builder'
    : phase === 'live'
      ? 'Live Bidding'
      : null;

  return (
    <article
      className={cn(
        'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        'dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-none',
      )}
    >
      <div
        className={cn(
          'space-y-3 border-l-[3px] pl-3 sm:pl-4',
          canSelect ? 'border-l-amber-500' : 'border-l-emerald-500',
        )}
      >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={canSelect ? 'amber' : 'emerald'}>{statusLabel ?? serviceBadge}</Badge>
            {statusLabel ? (
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{serviceBadge}</span>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            {metaParts.map((part, index) => (
              <span key={`${part}-${index}`} className="inline-flex items-center gap-2">
                {index > 0 ? (
                  <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                    •
                  </span>
                ) : null}
                {index === metaParts.length - 1 ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {part}
                  </span>
                ) : (
                  <span>{part}</span>
                )}
              </span>
            ))}
            {postedAt ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                  •
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Posted {postedAt}
                </span>
              </span>
            ) : null}
          </div>
          {floorScopes.length > 0 ? (
            <FloorScopeBadges
              items={floorScopes}
              className="mt-2.5 text-slate-600 dark:text-slate-400"
              variant="plain"
            />
          ) : null}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {phase === 'live' && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Closes in</span>
              <AuctionCountdown targetDateISO={project.bidding_ends_at} projectId={project.id} compact />
            </div>
          )}
          {canSelect && project.selection_ends_at && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-red-400 uppercase tracking-wider font-semibold animate-pulse">
                Select now
              </span>
              <AuctionCountdown targetDateISO={project.selection_ends_at} projectId={project.id} compact />
            </div>
          )}
          <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
        </div>
      </div>

      {canSelect && (
        <div className="flex items-start gap-3">
          <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Bidding Closed — {isFirm ? 'Select Your Construction Firm' : 'Select Your Builder'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Choose a {isFirm ? 'firm' : 'builder'} before the timer expires. Contact details remain private until
              you award the contract. If no selection is made, this listing will expire.
            </p>
          </div>
        </div>
      )}

      {phase === 'live' && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-600 align-middle animate-pulse dark:bg-emerald-400" />
          Live auction in progress. {isFirm ? 'Firm' : 'Builder'} names and profile photos are visible on the
          leaderboard; contact details stay private. Rankings update in real-time.
        </p>
      )}

      {isFirm ? (
        <UnifiedFirmBidRankings
          compactEmpty
          initialBids={initialBids}
          initialFirms={initialFirms}
        />
      ) : (
        <UnifiedBidRankings
          compactEmpty
          initialBids={initialBids}
          initialBuilders={initialBuilders}
          userId={userId}
        />
      )}
      </div>
    </article>
  );
}

/** Inline live auction + selection UI for the owner dashboard. */
export function OwnerLiveProjectCard(props: OwnerLiveProjectCardProps) {
  return (
    <OwnerProjectPhaseProvider initialProject={props.project}>
      <OwnerLiveProjectCardBody {...props} />
    </OwnerProjectPhaseProvider>
  );
}

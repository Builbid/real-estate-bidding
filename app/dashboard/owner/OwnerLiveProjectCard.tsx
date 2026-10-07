'use client';

import type { ReactNode } from 'react';
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
  isFloorScopeRequirementLabel,
  isCivilFloorCastingService,
} from '@/lib/project/formatFloorSummary';
import { getProjectWorkRequirementBlocks, isFloorFixtureRequirementLabel } from '@/lib/project/workRequirements';
import { formatNumericProjectId } from '@/lib/project/numericId';
import { FloorScopeBadges } from '@/components/project/FloorScopeBadges';
import { CheckLocationLink } from '@/components/project/ProjectLocationWithMapsLink';
import { earthworkCardLocation } from '@/lib/validation/earthworkLocation';
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

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

const TAG_BOX_CLASS =
  'inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300';

type ScopeTag = { label: string; value: string };

/**
 * Scope-of-work details as structured label/value tags from what the owner submitted.
 * Per-floor scope rows are skipped when floor badges are shown, and the plinth / built-up
 * area is surfaced separately so it never appears twice.
 */
function buildScopeTags(project: Project, hasFloorBadges: boolean, hasAreaTag: boolean): ScopeTag[] {
  return (getProjectWorkRequirementBlocks(project)?.blocks ?? [])
    .filter((block) => {
      if (!block.value?.trim()) return false;
      if (block.label === 'Calculated Total Floor Area') return false;
      if (isFloorFixtureRequirementLabel(block.label)) return false;
      if (hasFloorBadges && isFloorScopeRequirementLabel(block.label)) return false;
      if (hasAreaTag && /plinth|built.?up|floor area|approximate area/i.test(block.label)) return false;
      return true;
    })
    .slice(0, 4)
    .map((block) => ({
      label: block.label.replace(/:$/, ''),
      value: truncate(block.value, 48),
    }));
}

function ScopeTagBox({ label, value }: ScopeTag) {
  return (
    <span className={TAG_BOX_CLASS} title={`${label}: ${value}`}>
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}:</span>
      <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </span>
  );
}

function ScopeSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

/** Public Project ID tag, e.g. #PRJ-K7M2Q9P1 (falls back to the short internal ID). */
function projectIdTag(project: Project): string {
  const publicId = formatNumericProjectId(project.numeric_id);
  const id = publicId !== '—' ? publicId : project.id.slice(0, 8).toUpperCase();
  return `#PRJ-${id}`;
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
  const earthworkLocation = earthworkCardLocation(project);
  const locationLabel = earthworkLocation?.address || getProjectLocationLabel(project);
  const buildingTypeLabel = getProjectBuildingTypeLabel(project);
  const builtUpLabel = getProjectBuiltUpAreaLabel(project);
  const floorScopes = formatFloorSummary(project);

  // Plinth / built-up area is shown as a scope tag below, not in this meta line.
  const metaParts = [
    locationLabel || null,
    buildingTypeLabel,
    `${bidCount} bid${bidCount !== 1 ? 's' : ''}`,
  ].filter(Boolean) as string[];

  // The redundant "Live Bidding" sub-badge is gone; only the selection-phase badge remains.
  const statusLabel = canSelect ? (isFirm ? 'Select Firm' : 'Select Builder') : null;
  const scopeTags = buildScopeTags(project, floorScopes.length > 0, Boolean(builtUpLabel));
  const fallbackDescription = project.description?.trim();
  const hasScopeDetails = scopeTags.length > 0 || Boolean(builtUpLabel) || floorScopes.length > 0;
  const idTag = projectIdTag(project);

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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.title}</p>
            <span
              className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Unique Project ID"
            >
              Project ID: {idTag}
            </span>
          </div>
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
                ) : index === 0 && earthworkLocation ? (
                  <span className="inline-flex flex-wrap items-center">
                    <span>{part}</span>
                    <CheckLocationLink mapsQuery={earthworkLocation.mapsQuery} pincode={project.pincode} />
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
          {hasScopeDetails ? (
            <div className="mt-3 space-y-2.5">
              {scopeTags.length > 0 || builtUpLabel ? (
                <div>
                  <ScopeSectionLabel>Scope of Work</ScopeSectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {builtUpLabel ? (
                      <ScopeTagBox label="Approx. Plinth Area" value={builtUpLabel} />
                    ) : null}
                    {scopeTags.map((tag) => (
                      <ScopeTagBox key={`${tag.label}:${tag.value}`} {...tag} />
                    ))}
                  </div>
                </div>
              ) : null}
              {floorScopes.length > 0 ? (
                <div>
                  <ScopeSectionLabel>
                    {isCivilFloorCastingService(project.service_type ?? 'labour_contractor')
                      ? 'Floor Casting'
                      : 'Drawing Scope'}
                  </ScopeSectionLabel>
                  <FloorScopeBadges items={floorScopes} />
                </div>
              ) : null}
            </div>
          ) : fallbackDescription ? (
            <div className="mt-3">
              <ScopeSectionLabel>Scope of Work</ScopeSectionLabel>
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                {truncate(fallbackDescription, 160)}
              </p>
            </div>
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
          Live auction in progress. You can select a builder as soon as a bid is placed.
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

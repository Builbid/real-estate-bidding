'use client';

import { Lock, Clock, Users, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuctionCountdown } from './AuctionCountdown';
import { DeleteProjectButton } from './DeleteProjectButton';
import { UnifiedBidRankings } from './project/[id]/UnifiedBidRankings';
import {
  TRACK_LABELS,
  getConstructionLabel,
  formatProjectPostedAt,
  type ProjectPhase,
} from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Project, Bid } from '@/lib/types';

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
  phase: ProjectPhase;
  initialBids: Bid[];
  initialBuilders: Record<string, BuilderInfo>;
  biddingHasEnded: boolean;
  userId: string;
  priority?: boolean;
}

/** Inline live auction + selection UI for the owner dashboard. */
export function OwnerLiveProjectCard({
  project,
  bidCount,
  phase,
  initialBids,
  initialBuilders,
  biddingHasEnded,
  userId,
  priority,
}: OwnerLiveProjectCardProps) {
  const configLabel = getConstructionLabel(project.track_type, project.sub_configuration);
  const postedAt = formatProjectPostedAt(project.created_at);
  const isReveal = biddingHasEnded;
  const canSelect =
    biddingHasEnded &&
    !project.selected_builder_id &&
    project.status !== 'completed' &&
    project.status !== 'cancelled';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card/80 dark:bg-card/60 overflow-hidden',
        priority ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-border'
      )}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4 p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {phase === 'live' && (
              <Badge variant="emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Bidding
              </Badge>
            )}
            {phase === 'transitioning' && (
              <Badge variant="default">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                Closing…
              </Badge>
            )}
            {phase === 'select' && (
              <Badge variant="indigo">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Select Builder
              </Badge>
            )}
            <Badge>{TRACK_LABELS[project.track_type]}</Badge>
          </div>
          <p className="text-sm font-semibold text-foreground">{project.title}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{project.district}</span>
            <span className="text-muted-foreground/60 hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground">{configLabel}</span>
            <span className="text-muted-foreground/60 hidden sm:inline">·</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {bidCount} bid{bidCount !== 1 ? 's' : ''}
            </div>
            {postedAt && (
              <>
                <span className="text-muted-foreground/60 hidden sm:inline">·</span>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Posted {postedAt}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {phase === 'live' && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Closes in</span>
              <AuctionCountdown targetDateISO={project.bidding_ends_at} projectId={project.id} compact />
            </div>
          )}
          {phase === 'select' && project.selection_ends_at && (
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

      {/* ── Live auction body ────────────────────────────────── */}
      <div className="p-4 space-y-4">
        {(phase === 'live' || canSelect) && (
          <div className="flex flex-wrap items-start gap-4">
            {phase === 'live' && (
              <Card className="border-emerald-500/20 flex-shrink-0">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-[10px] text-emerald-400 uppercase tracking-wider">
                    Bidding Closes In
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <AuctionCountdown targetDateISO={project.bidding_ends_at} projectId={project.id} compact />
                </CardContent>
              </Card>
            )}
            {canSelect && project.selection_ends_at && (
              <Card className="border-amber-500/20 flex-shrink-0">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Selection Closes In
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <AuctionCountdown targetDateISO={project.selection_ends_at} projectId={project.id} compact />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {canSelect && (
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
            <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-300 mb-1">
                Bidding Closed — Select Your Builder
              </p>
              <p className="text-xs text-indigo-400/70">
                Choose a builder before the timer expires. Contact details remain private until
                you award the contract. If no selection is made, this project will be automatically
                cancelled.
              </p>
            </div>
          </div>
        )}

        {phase === 'live' && (
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1.5 flex-shrink-0" />
            <p className="text-xs text-emerald-300">
              Live auction in progress. Builder names and profile photos are visible on the
              leaderboard; contact details stay private. Rankings update in real-time.
            </p>
          </div>
        )}

        {phase === 'transitioning' && (
          <div className="p-3 rounded-xl bg-secondary/50 border border-border flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse mt-1.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Bidding has ended — finalizing results…
            </p>
          </div>
        )}

        <Card className="border-border bg-card/80 dark:bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>
                Bid Rankings
                <span className="ml-2 text-xs font-normal text-muted-foreground">({initialBids.length})</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedBidRankings
              project={project}
              initialBids={initialBids}
              initialBuilders={initialBuilders}
              isReveal={isReveal}
              isFrozen={canSelect || project.status === 'frozen_24h'}
              userId={userId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

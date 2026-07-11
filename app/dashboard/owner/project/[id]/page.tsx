export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, Lock, UserCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_ICON_BUTTON } from '@/lib/navStyles';
import { cn } from '@/lib/utils';
import { AuctionCountdown } from '../../AuctionCountdown';
import { STATUS_CONFIG, TRACK_LABELS } from '@/lib/utils';
import { ConstructionMatrixSummary } from '@/components/construction/ConstructionMatrixSummary';
import type { Project, Bid, PublicFirmProfile } from '@/lib/types';
import { UnifiedBidRankings } from './UnifiedBidRankings';
import { UnifiedFirmBidRankings } from './UnifiedFirmBidRankings';
import { isFirmProject } from '@/lib/project/display';

interface BuilderInfo {
  id: string;
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getData(id: string) {
  const { supabase, userId } = await getAuthUser();

  await supabase.rpc('expire_active_projects');

  const { data: rawProject } = await supabase.from('projects').select('*').eq('id', id).single();
  if (!rawProject) notFound();
  if (rawProject.owner_id !== userId) redirect('/dashboard/owner');

  const now = new Date();
  let project = rawProject as Project;

  // Inline transition for this project — reliable even if bulk RPC lags
  if (project.status === 'active_24h' && new Date(project.bidding_ends_at) <= now) {
    await supabase
      .from('projects')
      .update({
        status: 'frozen_24h',
        selection_ends_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq('id', id)
      .eq('status', 'active_24h');

    const { data: refreshed } = await supabase.from('projects').select('*').eq('id', id).single();
    if (refreshed) project = refreshed as Project;
  }

  if (
    project.status === 'frozen_24h' &&
    project.selection_ends_at &&
    new Date(project.selection_ends_at) <= now &&
    !project.selected_builder_id
  ) {
    await supabase.from('projects').update({ status: 'cancelled' }).eq('id', id);
    const { data: refreshed } = await supabase.from('projects').select('*').eq('id', id).single();
    if (refreshed) project = refreshed as Project;
  }

  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', id)
    .eq('is_withdrawn', false)
    .order('total_sum_metric', { ascending: true });

  // Builder/firm names are public; contact details stay in raw profiles only.
  const biddingHasEnded = new Date(project.bidding_ends_at) <= now;
  let builders: Record<string, BuilderInfo> = {};
  let firms: Record<string, PublicFirmProfile> = {};

  if (bids && bids.length > 0) {
    const bidderIds = [
      ...new Set(bids.map((b: Bid) => b.builder_id).filter(Boolean)),
    ] as string[];

    if (isFirmProject(project as Project)) {
      const { data: firmData } = await supabase
        .from('firms_public')
        .select('*')
        .in('id', bidderIds);

      if (firmData) {
        firms = Object.fromEntries(
          (firmData as PublicFirmProfile[]).map((f) => [f.id, f]),
        );
      }
    } else {
      const { data: profileData } = await supabase
        .from('profiles_public')
        .select('id, full_name, is_verified, avatar_url, created_at')
        .in('id', bidderIds);

      if (profileData) {
        builders = Object.fromEntries(
          (profileData as BuilderInfo[]).map((p) => [p.id, p]),
        );
      }
    }
  }

  return { project, bids: (bids ?? []) as Bid[], builders, firms, userId, biddingHasEnded };
}

export default async function OwnerProjectPage({ params }: PageProps) {
  const { id } = await params;
  const { project, bids, builders, firms, userId, biddingHasEnded } = await getData(id);
  const isFirm = isFirmProject(project);

  const now = new Date();

  type Phase = 'live' | 'transitioning' | 'select' | 'done';
  let phase: Phase;
  if (project.status === 'active_24h') {
    phase = new Date(project.bidding_ends_at) > now ? 'live' : 'transitioning';
  } else if (project.status === 'frozen_24h') {
    phase = 'select';
  } else {
    phase = 'done';
  }

  const isReveal = biddingHasEnded;
  const canSelect =
    biddingHasEnded &&
    !project.selected_builder_id &&
    project.status !== 'completed' &&
    project.status !== 'cancelled';

  const configSummary = (
    <ConstructionMatrixSummary
      trackType={project.track_type}
      subConfiguration={project.sub_configuration}
      className="inline-flex flex-col gap-0.5"
    />
  );

  const selectedBuilder = project.selected_builder_id
    ? builders[project.selected_builder_id]
    : null;
  const selectedFirm = project.selected_builder_id
    ? firms[project.selected_builder_id]
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <NavLink
          href="/dashboard/owner"
          prefetch
          className={cn(NAV_ICON_BUTTON, 'p-1 text-muted-foreground hover:text-foreground')}
        >
          <ArrowLeft className="w-5 h-5" />
        </NavLink>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{project.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.district} · {TRACK_LABELS[project.track_type]}
          </p>
          <div className="mt-2">{configSummary}</div>
        </div>
        {phase === 'live' && (
          <Badge variant="emerald" className="flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Bidding
          </Badge>
        )}
        {phase === 'transitioning' && (
          <Badge variant="default" className="flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
            Closing…
          </Badge>
        )}
        {phase === 'select' && (
          <Badge variant="indigo" className="flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {isFirm ? 'Select Firm' : 'Select Builder'}
          </Badge>
        )}
        {phase === 'done' && (
          <Badge variant="default" className="flex-shrink-0">
            {STATUS_CONFIG[project.status].label}
          </Badge>
        )}
      </div>

      {/* ── Info bar: countdown + selected builder ──────────────── */}
      {(phase === 'live' || canSelect || selectedBuilder) && (
        <div className="flex flex-wrap items-start gap-4">
          {phase === 'live' && (
            <Card className="border-emerald-500/20 flex-shrink-0">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] text-emerald-400 uppercase tracking-wider">
                  Closes In
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

          {(selectedBuilder || selectedFirm) && (
            <Card className="border-emerald-500/30">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3" />
                  {isFirm ? 'Selected Firm' : 'Selected Builder'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm font-bold text-foreground">
                  {selectedFirm?.company_name ?? selectedBuilder?.full_name}
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5">✓ Contract awarded</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Status banners ───────────────────────────────────────── */}
      {canSelect && (
        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
          <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-300 mb-1">
              Bidding Closed — {isFirm ? 'Select Your Construction Firm' : 'Select Your Builder'}
            </p>
            <p className="text-xs text-indigo-400/70">
              {isFirm
                ? '🎉 Review firm bids below and select the company that best fits your project. BuilBid will arrange a meeting to finalize the construction agreement.'
                : 'Review all bids below and select the builder who best fits your project. Contact details remain private until you award the contract.'}
            </p>
          </div>
        </div>
      )}

      {phase === 'live' && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1.5 flex-shrink-0" />
          <p className="text-xs text-emerald-300">
            Live auction in progress. Builder names and profile photos are visible on the
            leaderboard; contact details stay private. Rankings update in real-time.
          </p>
        </div>
      )}

      {/* ── Unified bid rankings ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              Bid Rankings
              <span className="ml-2 text-sm font-normal text-muted-foreground">({bids.length})</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFirm ? (
            <UnifiedFirmBidRankings
              project={project}
              initialBids={bids}
              initialFirms={firms}
              isReveal={isReveal}
              isFrozen={canSelect || project.status === 'frozen_24h'}
            />
          ) : (
            <UnifiedBidRankings
              project={project}
              initialBids={bids}
              initialBuilders={builders}
              isReveal={isReveal}
              isFrozen={canSelect || project.status === 'frozen_24h'}
              userId={userId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

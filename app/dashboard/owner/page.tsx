export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { processAuctionTransitions } from '@/app/actions/auction';
import { redirect } from 'next/navigation';
import { getDashboardPath } from '@/lib/auth/roles';
import Link from 'next/link';
import { Plus, Building } from 'lucide-react';
import { OwnerLiveProjectCard } from './OwnerLiveProjectCard';
import { CompletedProjectsPreview } from '@/components/dashboard/CompletedProjectsPreview';
import { DashboardWorkSection } from '@/components/dashboard/DashboardWorkSection';
import { Button } from '@/components/ui/button';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { isAgreementComplete, isAwaitingAgreement } from '@/lib/dashboard/completedProjects';
import { getProjectPhase, isInteractiveProjectPhase, sortByCreatedAtDesc, sortByTimestampDesc, type ProjectPhase } from '@/lib/utils';
import type { Project, Bid } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

interface BuilderInfo {
  id: string;
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
}

type ProjectWithBidCount = Project & { bids: [{ count: number }] };

interface LiveProjectBundle {
  project: Project;
  bidCount: number;
  phase: ProjectPhase;
  bids: Bid[];
  builders: Record<string, BuilderInfo>;
  biddingHasEnded: boolean;
}

async function enrichLiveProject(
  supabase: SupabaseClient,
  project: ProjectWithBidCount,
): Promise<LiveProjectBundle> {
  const bidCount = project.bids?.[0]?.count ?? 0;
  const phase = getProjectPhase(project);
  const biddingHasEnded = new Date(project.bidding_ends_at) <= new Date();

  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', project.id)
    .eq('is_withdrawn', false)
    .order('total_sum_metric', { ascending: true });

  let builders: Record<string, BuilderInfo> = {};

  if (bids && bids.length > 0) {
    const builderIds = [
      ...new Set(bids.map((b) => b.builder_id).filter(Boolean)),
    ] as string[];

    const { data: profileData } = await supabase
      .from('profiles_public')
      .select('id, full_name, is_verified, avatar_url, created_at')
      .in('id', builderIds);

    if (profileData) {
      builders = Object.fromEntries(
        (profileData as BuilderInfo[]).map((p) => [p.id, p])
      );
    }
  }

  return {
    project,
    bidCount,
    phase,
    bids: (bids ?? []) as Bid[],
    builders,
    biddingHasEnded,
  };
}

async function getData() {
  // getAuthUser() redirects to /login when there is no session.
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  // Housekeeping must never blank the dashboard if it fails.
  try {
    await processAuctionTransitions();
  } catch (err) {
    console.error('[owner dashboard] processAuctionTransitions failed (non-fatal):', err);
  }

  const { data: dbProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  const profile = dbProfile ?? {
    id: userId, email, full_name: fullName, role,
    mobile: null, physical_address: null, pincode: null,
    created_at: '', updated_at: '',
  };
  // Send other roles to their own dashboard (never back to a route that bounces here).
  if (profile.role !== 'owner') redirect(getDashboardPath(profile.role));

  try {
    await supabase.rpc('expire_active_projects');
  } catch (err) {
    console.error('[owner dashboard] expire_active_projects failed (non-fatal):', err);
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*, bids(count)')
    .eq('owner_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (projectsError) {
    // Surface a real error (handled by error.tsx) instead of rendering an empty screen.
    throw new Error(`Could not load your projects: ${projectsError.message}`);
  }

  const allProjects = sortByCreatedAtDesc(
    ((projects ?? []).filter((p) => p.status !== 'cancelled') as ProjectWithBidCount[]),
  );

  const activeProjects = allProjects.filter((p) => !isAgreementComplete(p));
  // Awarded projects stay on this dashboard until a supervisor signs the agreement,
  // even after the bidding or selection window has ended.
  const interactiveProjects = activeProjects.filter(
    (p) => isInteractiveProjectPhase(getProjectPhase(p)) || isAwaitingAgreement(p),
  );

  const liveBundles = await Promise.all(
    interactiveProjects.map((p) => enrichLiveProject(supabase, p))
  );

  const byNewest = (bundles: LiveProjectBundle[]) =>
    sortByTimestampDesc(bundles, (bundle) => bundle.project.created_at);

  const agreementPending = byNewest(liveBundles.filter((b) => isAwaitingAgreement(b.project)));
  const openBundles = liveBundles.filter((b) => !isAwaitingAgreement(b.project));
  const selectionRequired = byNewest(
    openBundles.filter(
      (b) => b.phase === 'select' || b.phase === 'transitioning' || b.biddingHasEnded,
    ),
  );
  const liveAuctions = byNewest(
    openBundles.filter((b) => b.phase === 'live' && !b.biddingHasEnded),
  );

  const completed = sortByCreatedAtDesc(allProjects.filter((p) => isAgreementComplete(p)));

  return { profile, userId, agreementPending, selectionRequired, liveAuctions, completed };
}

export default async function OwnerDashboard() {
  const { profile, userId, agreementPending, selectionRequired, liveAuctions, completed } = await getData();

  const hasAnyProject =
    agreementPending.length > 0 ||
    selectionRequired.length > 0 ||
    liveAuctions.length > 0 ||
    completed.length > 0;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <HistoryBackButton className="mb-3" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Owner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, <span className="text-foreground font-semibold">{profile.full_name}</span>
            </p>
          </div>
          <Button asChild>
            <Link href="/#services">
              <Plus className="w-4 h-4" /> Post New Project
            </Link>
          </Button>
        </div>
      </div>

      {agreementPending.length > 0 && (
        <DashboardWorkSection
          tone="agreement"
          title="Selected projects"
          count={agreementPending.length}
        >
          <div className="space-y-5">
            {agreementPending.map((bundle) => (
              <OwnerLiveProjectCard
                key={bundle.project.id}
                project={bundle.project}
                bidCount={bundle.bidCount}
                initialBids={bundle.bids}
                initialBuilders={bundle.builders}
                userId={userId}
              />
            ))}
          </div>
        </DashboardWorkSection>
      )}

      {selectionRequired.length > 0 && (
        <DashboardWorkSection
          tone="select"
          title="Needs your decision"
          count={selectionRequired.length}
          description="Bidding has closed. Select a worker to award the contract."
        >
          <div className="space-y-5">
            {selectionRequired.map((bundle) => (
              <OwnerLiveProjectCard
                key={bundle.project.id}
                project={bundle.project}
                bidCount={bundle.bidCount}
                initialBids={bundle.bids}
                initialBuilders={bundle.builders}
                userId={userId}
                priority
              />
            ))}
          </div>
        </DashboardWorkSection>
      )}

      {hasAnyProject && (
      <DashboardWorkSection
        tone="live"
        title="Live bidding"
        count={liveAuctions.length}
        description="Auctions still receiving bids. Rankings update in real time."
      >
        {liveAuctions.length > 0 ? (
          <div className="space-y-5">
            {liveAuctions.map((bundle) => (
              <OwnerLiveProjectCard
                key={bundle.project.id}
                project={bundle.project}
                bidCount={bundle.bidCount}
                initialBids={bundle.bids}
                initialBuilders={bundle.builders}
                userId={userId}
              />
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No live auctions right now.
          </p>
        )}
      </DashboardWorkSection>
      )}

      {!hasAnyProject && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Building className="w-10 h-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No Projects Yet</p>
            <p className="text-xs text-muted-foreground">
              Post your first construction project and start receiving competitive bids.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/owner/new-project">
              <Plus className="w-4 h-4" /> Post First Project
            </Link>
          </Button>
        </div>
      )}

      <CompletedProjectsPreview
        projects={completed}
        viewHrefFor={(project) => `/dashboard/owner/project/${project.id}`}
        showDelete
      />
    </div>
  );
}

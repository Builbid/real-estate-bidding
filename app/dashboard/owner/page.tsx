export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { processAuctionTransitions } from '@/app/actions/auction';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Building, ArrowLeft } from 'lucide-react';
import { OwnerLiveProjectCard } from './OwnerLiveProjectCard';
import { CompletedProjectsPreview } from '@/components/dashboard/CompletedProjectsPreview';
import { DashboardWorkSection } from '@/components/dashboard/DashboardWorkSection';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn, getProjectPhase, isInteractiveProjectPhase, type ProjectPhase } from '@/lib/utils';
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
  await processAuctionTransitions();

  const { supabase, userId, role, email, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? {
    id: userId, email, full_name: fullName, role,
    mobile: null, physical_address: null, pincode: null,
    created_at: '', updated_at: '',
  };
  if (profile.role !== 'owner') redirect('/dashboard');

  await supabase.rpc('expire_active_projects');

  const { data: projects } = await supabase
    .from('projects')
    .select('*, bids(count)')
    .eq('owner_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  const allProjects = (projects ?? []).filter(
    (p) => p.status !== 'cancelled',
  ) as ProjectWithBidCount[];

  const interactiveProjects = allProjects.filter((p) =>
    isInteractiveProjectPhase(getProjectPhase(p))
  );

  const liveBundles = await Promise.all(
    interactiveProjects.map((p) => enrichLiveProject(supabase, p))
  );

  const selectionRequired = liveBundles.filter(
    (b) => b.phase === 'select' || b.phase === 'transitioning' || b.biddingHasEnded,
  );
  const liveAuctions = liveBundles.filter(
    (b) => b.phase === 'live' && !b.biddingHasEnded,
  );

  const completed = allProjects
    .filter((p) => p.status === 'completed')
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  return { profile, userId, selectionRequired, liveAuctions, completed };
}

export default async function OwnerDashboard() {
  const { profile, userId, selectionRequired, liveAuctions, completed } = await getData();

  const hasAnyProject =
    selectionRequired.length > 0 || liveAuctions.length > 0 || completed.length > 0;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-3')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Owner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, <span className="text-foreground font-semibold">{profile.full_name}</span>
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/owner/new-project">
              <Plus className="w-4 h-4" /> Post New Project
            </Link>
          </Button>
        </div>
      </div>

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
        variant="folder"
        projects={completed}
        totalCount={completed.length}
        viewAllHref="/dashboard/owner/projects/completed"
        viewHrefFor={(project) => `/dashboard/owner/project/${project.id}`}
        showDelete
      />
    </div>
  );
}

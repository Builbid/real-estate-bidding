export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getAuthUser } from '@/lib/supabase/getUser';
import { processAuctionTransitions } from '@/app/actions/auction';
import { redirect } from 'next/navigation';
import { getDashboardPath } from '@/lib/auth/roles';
import Link from 'next/link';
import { Plus, Building } from 'lucide-react';
import { OwnerLiveProjectCard } from './OwnerLiveProjectCard';
import { SelectedProjectsFolder } from '@/components/dashboard/SelectedProjectsFolder';
import { DashboardWorkSection } from '@/components/dashboard/DashboardWorkSection';
import { Button } from '@/components/ui/button';
import { isOwnerSelectedProject } from '@/lib/dashboard/completedProjects';
import { getProjectPhase, sortByCreatedAtDesc, sortByTimestampDesc, type ProjectPhase } from '@/lib/utils';
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
  let archivedAgreementIds: string[] = [];
  try {
    const transition = await processAuctionTransitions();
    archivedAgreementIds = transition.archivedAgreementIds;
  } catch (err) {
    console.error('[owner dashboard] processAuctionTransitions failed (non-fatal):', err);
  }
  const hiddenAgreementIds = new Set(archivedAgreementIds);

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
    ((projects ?? []).filter(
      (p) => p.status !== 'cancelled' && p.status !== 'expired' && !hiddenAgreementIds.has(p.id),
    ) as ProjectWithBidCount[]),
  );

  // A selected worker moves the project out of the active feed and into Selected Projects.
  const selectedProjects = allProjects.filter((project) => isOwnerSelectedProject(project));
  const pendingProjects = allProjects.filter((project) => !isOwnerSelectedProject(project));

  const pendingBundles = await Promise.all(
    pendingProjects.map((project) => enrichLiveProject(supabase, project)),
  );
  const activeFeed = sortByTimestampDesc(pendingBundles, (bundle) => bundle.project.created_at);

  return { profile, userId, activeFeed, selectedCount: selectedProjects.length };
}

export default async function OwnerDashboard() {
  const { profile, userId, activeFeed, selectedCount } = await getData();

  const hasAnyProject = activeFeed.length > 0 || selectedCount > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-24 sm:px-6">
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

      {activeFeed.length > 0 && (
        <DashboardWorkSection
          tone="live"
          title="Active projects"
          count={activeFeed.length}
          description="Newest posted projects stay at the top. A project leaves this list when you select a worker."
        >
          <div className="space-y-5">
            {activeFeed.map((bundle) => (
              <OwnerLiveProjectCard
                key={bundle.project.id}
                project={bundle.project}
                bidCount={bundle.bidCount}
                initialBids={bundle.bids}
                initialBuilders={bundle.builders}
                userId={userId}
                priority={bundle.phase !== 'live'}
              />
            ))}
          </div>
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

      <SelectedProjectsFolder count={selectedCount} />
    </div>
  );
}

export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { processAuctionTransitions } from '@/app/actions/auction';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Building, TrendingUp, Clock, Layers, ArrowLeft } from 'lucide-react';
import { OwnerLiveProjectCard } from './OwnerLiveProjectCard';
import { CompletedProjectsPreview } from '@/components/dashboard/CompletedProjectsPreview';
import { CompletedProjectRow } from '@/components/dashboard/CompletedProjectRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NavLink } from '@/components/shared/NavLink';
import { STAT_ICON_STYLES, type StatIconColor } from '@/lib/dashboard/statIconStyles';
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
    .order('created_at', { ascending: false });

  const allProjects = (projects ?? []) as ProjectWithBidCount[];

  const interactiveProjects = allProjects.filter((p) =>
    isInteractiveProjectPhase(getProjectPhase(p))
  );

  const liveBundles = await Promise.all(
    interactiveProjects.map((p) => enrichLiveProject(supabase, p))
  );

  const selectionRequired = liveBundles.filter((b) => b.phase === 'select');
  const liveAuctions = liveBundles.filter(
    (b) => b.phase === 'live' || b.phase === 'transitioning'
  );

  const completed = allProjects
    .filter((p) => p.status === 'completed')
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  const cancelled = allProjects
    .filter((p) => p.status === 'cancelled')
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  return { profile, userId, selectionRequired, liveAuctions, completed, cancelled };
}

export default async function OwnerDashboard() {
  const { profile, userId, selectionRequired, liveAuctions, completed, cancelled } = await getData();

  const totalLive = selectionRequired.length + liveAuctions.length;

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Live Auctions', value: liveAuctions.length, icon: TrendingUp, color: 'emerald' as StatIconColor },
          { label: 'Awaiting Selection', value: selectionRequired.length, icon: Clock, color: 'indigo' as StatIconColor },
          { label: 'Completed', value: completed.length, icon: Building, color: 'teal' as StatIconColor },
          { label: 'Active on Dashboard', value: totalLive, icon: Layers, color: 'slate' as StatIconColor },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border', STAT_ICON_STYLES[color].box)}>
                  <Icon className={cn('h-4.5 w-4.5', STAT_ICON_STYLES[color].icon)} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selection required — full inline UI, no View button */}
      {selectionRequired.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <h2 className="text-base font-semibold text-foreground">Action Required — Select a Builder</h2>
          </div>
          <div className="space-y-4">
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
        </div>
      )}

      {/* Live auctions — full inline UI, no View button */}
      {liveAuctions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400">Live Auctions</h2>
          </div>
          <div className="space-y-4">
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
        </div>
      )}

      {/* Empty state */}
      {totalLive === 0 && completed.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4 text-center">
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
          </CardContent>
        </Card>
      )}

      {/* Completed — compact rows, 10 most recent, View All for the rest */}
      <CompletedProjectsPreview
        projects={completed}
        totalCount={completed.length}
        viewAllHref="/dashboard/owner/projects/completed"
        viewHrefFor={(project) => `/dashboard/owner/project/${project.id}`}
        showDelete
      />

      {/* Cancelled — owners can remove expired / unused listings */}
      {cancelled.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">Cancelled Projects</h2>
          <div className="space-y-3">
            {cancelled.map((project) => (
              <CompletedProjectRow
                key={project.id}
                project={project}
                bidCount={project.bids?.[0]?.count ?? 0}
                viewHref={`/dashboard/owner/project/${project.id}`}
                showDelete
                plainTags={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


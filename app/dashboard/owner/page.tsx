export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { processAuctionTransitions } from '@/app/actions/auction';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Building, TrendingUp, Users, Clock, ArrowRight, Layers } from 'lucide-react';
import { DeleteProjectButton } from './DeleteProjectButton';
import { OwnerLiveProjectCard } from './OwnerLiveProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  STATUS_CONFIG,
  TRACK_LABELS,
  getConstructionLabel,
  getProjectPhase,
  isInteractiveProjectPhase,
  type ProjectPhase,
} from '@/lib/utils';
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
    <div className="space-y-8">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Live Auctions', value: liveAuctions.length, icon: TrendingUp, color: 'emerald' },
          { label: 'Awaiting Selection', value: selectionRequired.length, icon: Clock, color: 'indigo' },
          { label: 'Completed', value: completed.length, icon: Building, color: 'teal' },
          { label: 'Active on Dashboard', value: totalLive, icon: Layers, color: 'slate' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 text-${color}-400`} />
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
                phase={bundle.phase}
                initialBids={bundle.bids}
                initialBuilders={bundle.builders}
                biddingHasEnded={bundle.biddingHasEnded}
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
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-semibold text-foreground">Live Auctions</h2>
          </div>
          <div className="space-y-4">
            {liveAuctions.map((bundle) => (
              <OwnerLiveProjectCard
                key={bundle.project.id}
                project={bundle.project}
                bidCount={bundle.bidCount}
                phase={bundle.phase}
                initialBids={bundle.bids}
                initialBuilders={bundle.builders}
                biddingHasEnded={bundle.biddingHasEnded}
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
            <Building className="w-10 h-10 text-muted-foreground/60" />
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

      {/* Cancelled — owners can remove expired / unused listings */}
      {cancelled.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">Cancelled Projects</h2>
          <div className="space-y-3">
            {cancelled.map((project) => (
              <ArchivedProjectRow
                key={project.id}
                project={project}
                bidCount={project.bids?.[0]?.count ?? 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed — compact rows with View button, most recent first */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">Completed Projects</h2>
          <div className="space-y-3">
            {completed.map((project) => (
              <ArchivedProjectRow
                key={project.id}
                project={project}
                bidCount={project.bids?.[0]?.count ?? 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArchivedProjectRow({
  project,
  bidCount,
}: {
  project: Project;
  bidCount: number;
}) {
  const configLabel = getConstructionLabel(project.track_type, project.sub_configuration);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/80 dark:bg-card/60 transition-colors hover:border-border">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="default">{STATUS_CONFIG[project.status].label}</Badge>
          <Badge>{TRACK_LABELS[project.track_type]}</Badge>
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">{project.district}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">{configLabel}</span>
          <span className="text-muted-foreground/60">·</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {bidCount} bid{bidCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/owner/project/${project.id}`}>
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

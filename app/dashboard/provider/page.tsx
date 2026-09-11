export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { ArrowLeft, Building } from 'lucide-react';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { STATUS_CONFIG, cn } from '@/lib/utils';
import { AuctionRow } from '../builder/AuctionRow';
import { formatBidUnitSuffix } from '@/lib/bid/earthworkBid';
import { canWorkerBidOnProject } from '@/lib/bid/workerBidEligibility';
import { getProviderSpecialtyEmoji, getProviderSpecialtyLabel } from '@/lib/trades';
import { CompletedProjectsPreview } from '@/components/dashboard/CompletedProjectsPreview';
import { DashboardStatTiles } from '@/components/dashboard/DashboardStatTiles';
import { fetchWorkerCompletedPreview, isCancelledStatus } from '@/lib/dashboard/completedProjects';
import type { Project, Bid } from '@/lib/types';

async function getData() {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? { id: userId, email, full_name: fullName, role, mobile: null, physical_address: null, pincode: null, service_type: null, created_at: '', updated_at: '' };
  if (profile.role !== 'service_provider') redirect('/dashboard');
  if (!profile.service_type) redirect('/dashboard');

  await supabase.rpc('expire_active_projects');

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active_24h')
    .eq('service_type', profile.service_type)
    .order('bidding_ends_at', { ascending: true });

  const { data: myBids } = await supabase
    .from('bids')
    .select('*')
    .eq('builder_id', userId)
    .order('created_at', { ascending: false });

  const bidProjectIds = (myBids ?? []).map((b) => b.project_id);
  const bidProjectsMap = new Map<string, Project>();

  if (bidProjectIds.length > 0) {
    const { data: bidProjects } = await supabase
      .from('projects')
      .select('*')
      .in('id', bidProjectIds)
      .neq('status', 'cancelled');

    (bidProjects ?? [])
      .filter((p) => !isCancelledStatus(p.status))
      .forEach((p) => bidProjectsMap.set(p.id, p as Project));
  }

  const completed = await fetchWorkerCompletedPreview(supabase, userId);

  const visibleBids = ((myBids ?? []) as Bid[]).filter((bid) => {
    const project = bidProjectsMap.get(bid.project_id)
      ?? (projects ?? []).find((p) => p.id === bid.project_id);
    return project != null && !isCancelledStatus(project.status);
  });

  return {
    profile,
    projects: (projects ?? []) as Project[],
    myBids: visibleBids,
    bidProjectsMap,
    userId,
    completed,
  };
}

export default async function ProviderDashboard() {
  const { profile, projects, myBids, bidProjectsMap, completed } = await getData();

  const tradeLabel = getProviderSpecialtyLabel(profile.service_type);
  const tradeEmoji = getProviderSpecialtyEmoji(profile.service_type);
  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const myBidMap       = new Map(myBids.map((b) => [b.project_id, b]));
  const bidsPlaced     = myBids.filter((b) => !b.is_withdrawn);

  return (
    <div className="space-y-8">
      <div>
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-3')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span>{tradeEmoji}</span> Worker Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome, <span className="text-foreground font-semibold">{profile.full_name}</span></p>
      </div>

      <DashboardStatTiles
        items={[
          { label: 'Open Auctions', value: activeProjects.length },
          { label: 'My Active Bids', value: bidsPlaced.length },
          { label: 'Contracts Won', value: completed.totalCount },
          { label: 'Total Participated', value: myBids.length },
        ]}
      />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-base font-semibold text-foreground">Open {tradeLabel} Auctions</h2>
          <span className="text-xs text-muted-foreground">{activeProjects.length}</span>
        </div>

        {activeProjects.length > 0 ? (
          <div>
            {activeProjects.map((project) => (
              <AuctionRow
                key={project.id}
                project={project}
                myBid={myBidMap.get(project.id)}
                canBid={canWorkerBidOnProject(profile.role, profile.service_type, project)}
                bidHrefOverride={`/dashboard/builder/bid/${project.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Building className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No Open Auctions</p>
            <p className="text-xs text-muted-foreground">Check back soon — new {tradeLabel.toLowerCase()} projects are posted regularly.</p>
          </div>
        )}
      </div>

      <CompletedProjectsPreview
        projects={completed.projects}
        totalCount={completed.totalCount}
        viewAllHref="/dashboard/worker/projects/completed"
        viewHrefFor={(project) => `/project/${project.id}`}
      />

      {myBids.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">My Bid History</h2>
          <div>
            {myBids.slice(0, 10).map((bid) => {
              const project =
                bidProjectsMap.get(bid.project_id) ??
                projects.find((p) => p.id === bid.project_id);
              return (
                <div key={bid.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{project?.title ?? 'Untitled Project'}</p>
                    <p className="text-xs text-muted-foreground">{project?.district ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{bid.total_sum_metric.toLocaleString('en-IN')}{formatBidUnitSuffix(bid.rates, undefined, project?.service_type ?? bid.service_type)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(bid.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  {project && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {STATUS_CONFIG[project.status].label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

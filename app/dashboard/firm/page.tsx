export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUS_CONFIG } from '@/lib/utils';
import { FirmAuctionRow } from './AuctionRow';
import { getFirmPortfolioAction } from '@/app/actions/firm';
import { formatPackageRateRange } from '@/lib/firm/bidDisplay';
import { CompletedProjectsPreview } from '@/components/dashboard/CompletedProjectsPreview';
import { DashboardStatTiles } from '@/components/dashboard/DashboardStatTiles';
import { fetchWorkerCompletedPreview, isCancelledStatus } from '@/lib/dashboard/completedProjects';
import type { Project, Bid } from '@/lib/types';

async function getData() {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? {
    id: userId, email, full_name: fullName, role,
    mobile: null, physical_address: null, pincode: null,
    company_name: null, logo_url: null,
    created_at: '', updated_at: '',
  };

  if (profile.role !== 'construction_firm') redirect('/dashboard');

  await supabase.rpc('expire_active_projects');

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('service_type', 'construction_firm')
    .eq('status', 'active_24h')
    .order('bidding_ends_at', { ascending: true });

  const { data: myBids } = await supabase
    .from('bids')
    .select('*')
    .eq('builder_id', userId)
    .order('created_at', { ascending: false });

  const { data: wonProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('selected_builder_id', userId)
    .eq('service_type', 'construction_firm')
    .neq('status', 'cancelled');

  const projectIds = (myBids ?? []).map((b) => b.project_id);
  const rankMap = new Map<string, number>();
  const bidProjectsMap = new Map<string, Project>();

  if (projectIds.length > 0) {
    const { data: bidProjects } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .neq('status', 'cancelled');

    (bidProjects ?? [])
      .filter((p) => !isCancelledStatus(p.status))
      .forEach((p) => bidProjectsMap.set(p.id, p as Project));

    const visibleProjectIds = [...bidProjectsMap.keys()];

    if (visibleProjectIds.length > 0) {
      const { data: allBids } = await supabase
        .from('bids')
        .select('project_id, total_sum_metric, builder_id')
        .in('project_id', visibleProjectIds)
        .eq('is_withdrawn', false)
        .order('total_sum_metric', { ascending: true });

      if (allBids) {
        const byProject = new Map<string, typeof allBids>();
        allBids.forEach((b) => {
          const list = byProject.get(b.project_id) ?? [];
          list.push(b);
          byProject.set(b.project_id, list);
        });
        byProject.forEach((list, pid) => {
          const idx = list.findIndex((b) => b.builder_id === userId);
          if (idx >= 0) rankMap.set(pid, idx + 1);
        });
      }
    }
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
    wins: wonProjects ?? [],
    rankMap,
    bidProjectsMap,
    userId,
    completed,
  };
}

export default async function FirmDashboardPage() {
  const { profile, projects, myBids, wins, rankMap, bidProjectsMap, completed } = await getData();

  const portfolio = await getFirmPortfolioAction();
  const showBanner = !profile.logo_url || portfolio.items.length === 0;

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const myBidMap = new Map(myBids.map((b) => [b.project_id, b]));
  const bidsPlaced = myBids.filter((b) => !b.is_withdrawn);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Worker Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome,{' '}
          <span className="text-foreground font-semibold">
            {profile.company_name ?? profile.full_name}
          </span>
        </p>
      </div>

      <DashboardStatTiles
        items={[
          { label: 'Open Auctions', value: activeProjects.length },
          { label: 'My Active Bids', value: bidsPlaced.length },
          { label: 'Contracts Won', value: wins.length },
          { label: 'Total Participated', value: myBids.length },
        ]}
      />

      {showBanner && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground mb-1">
              Complete your firm profile to win more bids
            </p>
            <p className="text-xs text-muted-foreground">
              Add your company logo and past projects.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/dashboard/firm/settings">
              Complete Profile <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-base font-semibold text-foreground">Open Auctions</h2>
          <span className="text-xs text-muted-foreground">{activeProjects.length}</span>
        </div>

        {activeProjects.length > 0 ? (
          <div>
            {activeProjects.map((project) => (
              <FirmAuctionRow
                key={project.id}
                project={project}
                myBid={myBidMap.get(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No Open Firm Auctions</p>
            <p className="text-xs text-muted-foreground">
              Check back soon — new projects are posted regularly.
            </p>
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
          <h2 className="text-base font-semibold text-muted-foreground mb-4">My Bids</h2>
          <div>
            {myBids.slice(0, 15).map((bid) => {
              const project = projects.find((p) => p.id === bid.project_id) ?? bidProjectsMap.get(bid.project_id);
              const rank = rankMap.get(bid.project_id);
              const canUpdate = project?.status === 'active_24h';

              return (
                <div key={bid.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {project?.title ?? 'Untitled Project'}
                    </p>
                    <p className="text-xs text-muted-foreground">{project?.district ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {formatPackageRateRange(bid.package_rates) ?? '—'}
                    </p>
                    {rank != null && (
                      <p className="text-[10px] text-muted-foreground">Rank #{rank}</p>
                    )}
                  </div>
                  {project && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {STATUS_CONFIG[project.status].label}
                    </p>
                  )}
                  {canUpdate && project && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/firm/bid/${project.id}`}>Update Bid</Link>
                    </Button>
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

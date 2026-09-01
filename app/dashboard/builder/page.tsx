export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { TrendingUp, Award, CheckCircle2, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STAT_ICON_STYLES, type StatIconColor } from '@/lib/dashboard/statIconStyles';
import { STATUS_CONFIG, cn } from '@/lib/utils';
import { formatBidUnitSuffix } from '@/lib/bid/earthworkBid';
import { canWorkerBidOnProject } from '@/lib/bid/workerBidEligibility';
import { AuctionRow } from './AuctionRow';
import { PortfolioManager } from './PortfolioManager';
import type { Project, Bid } from '@/lib/types';

async function getData() {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  // Use DB profile when available; fall back to JWT metadata if RLS is broken
  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? { id: userId, email, full_name: fullName, role, mobile: null, physical_address: null, pincode: null, created_at: '', updated_at: '' };
  if (profile.role !== 'labour_contractor') redirect('/dashboard');

  // Transition any expired active projects to frozen_24h
  await supabase.rpc('expire_active_projects');

  // Get all open (still biddable) projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active_24h')
    .order('bidding_ends_at', { ascending: true });

  // Get builder's own bids
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
      .in('id', bidProjectIds);

    (bidProjects ?? []).forEach((p) => bidProjectsMap.set(p.id, p as Project));
  }

  return { profile, projects: (projects ?? []) as Project[], myBids: (myBids ?? []) as Bid[], bidProjectsMap, userId };
}

export default async function BuilderDashboard() {
  const { profile, projects, myBids, bidProjectsMap, userId } = await getData();

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const myBidMap       = new Map(myBids.map((b) => [b.project_id, b]));
  const bidsPlaced     = myBids.filter((b) => !b.is_withdrawn);
  const wins           = myBids.filter((b) => false); // wins would come from selected_builder_id checks

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mistri Worker Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome, <span className="text-foreground font-semibold">{profile.full_name}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Auctions', value: activeProjects.length, icon: Building, color: 'emerald' as StatIconColor },
          { label: 'My Active Bids', value: bidsPlaced.length, icon: TrendingUp, color: 'indigo' as StatIconColor },
          { label: 'Contracts Won', value: wins.length, icon: Award, color: 'amber' as StatIconColor },
          { label: 'Total Participated', value: myBids.length, icon: CheckCircle2, color: 'teal' as StatIconColor },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', STAT_ICON_STYLES[color].box)}>
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

      {/* Active Auctions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-base font-semibold text-foreground">Open Auctions</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {activeProjects.length}
          </span>
        </div>

        {activeProjects.length > 0 ? (
          <div className="space-y-3">
            {activeProjects.map((project) => (
              <AuctionRow
                key={project.id}
                project={project}
                myBid={myBidMap.get(project.id)}
                canBid={canWorkerBidOnProject(profile.role, 'labour_contractor', project)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center">
              <Building className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No Open Auctions</p>
              <p className="text-xs text-muted-foreground">Check back soon — new projects are posted regularly.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Portfolio management */}
      <PortfolioManager builderId={userId} />

      {/* My bid history */}
      {myBids.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">My Bid History</h2>
          <div className="space-y-2">
            {myBids.slice(0, 10).map((bid) => {
              const project =
                bidProjectsMap.get(bid.project_id) ??
                projects.find((p) => p.id === bid.project_id);
              return (
                <div key={bid.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card/80 dark:bg-card/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{project?.title ?? 'Untitled Project'}</p>
                    <p className="text-xs text-muted-foreground">{project?.district ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{bid.total_sum_metric.toLocaleString('en-IN')}{formatBidUnitSuffix(bid.rates, undefined, project?.service_type ?? bid.service_type)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(bid.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  {project && (
                    <Badge variant={project.status === 'active_24h' ? 'emerald' : project.status === 'frozen_24h' ? 'indigo' : 'default'}>
                      {STATUS_CONFIG[project.status].label}
                    </Badge>
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

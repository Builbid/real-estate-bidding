export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp, Award, CheckCircle2, Building2, ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STAT_ICON_STYLES, type StatIconColor } from '@/lib/dashboard/statIconStyles';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/utils';
import { FirmAuctionRow } from './AuctionRow';
import { getFirmPortfolioAction } from '@/app/actions/firm';
import { formatPackageRateRange } from '@/lib/firm/bidDisplay';
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
    .eq('service_type', 'construction_firm');

  const projectIds = (myBids ?? []).map((b) => b.project_id);
  const rankMap = new Map<string, number>();
  const bidProjectsMap = new Map<string, Project>();

  if (projectIds.length > 0) {
    const { data: bidProjects } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds);

    (bidProjects ?? []).forEach((p) => bidProjectsMap.set(p.id, p as Project));

    const { data: allBids } = await supabase
      .from('bids')
      .select('project_id, total_sum_metric, builder_id')
      .in('project_id', projectIds)
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

  return {
    profile,
    projects: (projects ?? []) as Project[],
    myBids: (myBids ?? []) as Bid[],
    wins: wonProjects ?? [],
    rankMap,
    bidProjectsMap,
    userId,
  };
}

export default async function FirmDashboardPage() {
  const { profile, projects, myBids, wins, rankMap, bidProjectsMap } = await getData();

  const portfolio = await getFirmPortfolioAction();
  const showBanner = !profile.logo_url || portfolio.items.length === 0;

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const myBidMap = new Map(myBids.map((b) => [b.project_id, b]));
  const bidsPlaced = myBids.filter((b) => !b.is_withdrawn);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Firm Console</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome,{' '}
          <span className="text-foreground font-semibold">
            {profile.company_name ?? profile.full_name}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Auctions', value: activeProjects.length, icon: Building2, color: 'emerald' as StatIconColor },
          { label: 'My Active Bids', value: bidsPlaced.length, icon: TrendingUp, color: 'indigo' as StatIconColor },
          { label: 'Contracts Won', value: wins.length, icon: Award, color: 'amber' as StatIconColor },
          { label: 'Total Participated', value: myBids.length, icon: CheckCircle2, color: 'violet' as StatIconColor },
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

      {showBanner && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-1">
                🏗️ Complete your firm profile to win more bids!
              </p>
              <p className="text-xs text-muted-foreground">
                Add your company logo and past projects.
              </p>
            </div>
            <Button asChild className="bg-violet-600 hover:bg-violet-500 shrink-0">
              <Link href="/dashboard/firm/settings">
                Complete Profile <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
              <FirmAuctionRow
                key={project.id}
                project={project}
                myBid={myBidMap.get(project.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No Open Firm Auctions</p>
              <p className="text-xs text-muted-foreground">
                Check back soon — new projects are posted regularly.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {myBids.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">My Bids</h2>
          <div className="space-y-2">
            {myBids.slice(0, 15).map((bid) => {
              const project = projects.find((p) => p.id === bid.project_id) ?? bidProjectsMap.get(bid.project_id);
              const rank = rankMap.get(bid.project_id);
              const canUpdate = project?.status === 'active_24h';

              return (
                <div key={bid.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card/80">
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
                    <Badge variant={project.status === 'active_24h' ? 'emerald' : project.status === 'frozen_24h' ? 'indigo' : 'default'}>
                      {STATUS_CONFIG[project.status].label}
                    </Badge>
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

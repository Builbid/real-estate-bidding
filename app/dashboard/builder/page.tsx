export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { TrendingUp, Award, CheckCircle2, Building, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { STATUS_CONFIG, TRACK_LABELS, getConstructionLabel } from '@/lib/utils';
import { AuctionRow } from './AuctionRow';
import { PortfolioManager } from './PortfolioManager';
import { BuilderProfileSettings } from './BuilderProfileSettings';
import type { Project, Bid } from '@/lib/types';

async function getData() {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  // Use DB profile when available; fall back to JWT metadata if RLS is broken
  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? { id: userId, email, full_name: fullName, role, mobile: null, physical_address: null, pincode: null, created_at: '', updated_at: '' };
  if (profile.role !== 'labour_contractor') redirect('/dashboard');

  // Transition any expired active projects to frozen_24h
  await supabase.rpc('expire_active_projects');

  // Get all active + grace-period projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .in('status', ['active_24h', 'frozen_24h'])
    .order('bidding_ends_at', { ascending: true });

  // Get builder's own bids
  const { data: myBids } = await supabase
    .from('bids')
    .select('*')
    .eq('builder_id', userId)
    .order('created_at', { ascending: false });

  return { profile, projects: (projects ?? []) as Project[], myBids: (myBids ?? []) as Bid[], userId };
}

export default async function BuilderDashboard() {
  const { profile, projects, myBids, userId } = await getData();

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const graceProjects  = projects.filter(
    (p) => p.status === 'frozen_24h' && p.selection_ends_at && new Date(p.selection_ends_at) > new Date()
  );
  const myBidMap       = new Map(myBids.map((b) => [b.project_id, b]));
  const bidsPlaced     = myBids.filter((b) => !b.is_withdrawn);
  const wins           = myBids.filter((b) => false); // wins would come from selected_builder_id checks

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contractor Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome, <span className="text-foreground font-semibold">{profile.full_name}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Auctions', value: activeProjects.length, icon: Building, color: 'emerald' },
          { label: 'My Active Bids', value: bidsPlaced.length, icon: TrendingUp, color: 'indigo' },
          { label: 'Contracts Won', value: wins.length, icon: Award, color: 'amber' },
          { label: 'Total Participated', value: myBids.length, icon: CheckCircle2, color: 'teal' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
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
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center">
              <Building className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No Open Auctions</p>
              <p className="text-xs text-muted-foreground">Check back soon — new projects are posted regularly.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grace Period Auctions */}
      {graceProjects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-base font-semibold text-foreground">Grace Period — Submit Before Deadline</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {graceProjects.length}
            </span>
          </div>
          <div className="space-y-3">
            {graceProjects.map((project) => {
              const myBid = myBidMap.get(project.id);
              const hasBid = !!myBid;
              const configLabel = getConstructionLabel(project.track_type, project.sub_configuration);
              return (
                <div key={project.id} className={`flex items-center gap-4 p-4 rounded-xl border bg-amber-500/5 transition-colors hover:border-amber-500/40 ${hasBid ? 'border-amber-500/30' : 'border-amber-500/15'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="indigo">
                        <Clock className="w-3 h-3" />
                        Grace Period
                      </Badge>
                      <Badge>{TRACK_LABELS[project.track_type]}</Badge>
                      {hasBid && (
                        <Badge variant="indigo">Your Bid: ₹{myBid.total_sum_metric.toLocaleString('en-IN')}/sqft</Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{project.district}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-xs text-muted-foreground">{configLabel}</span>
                    </div>
                  </div>
                  {project.selection_ends_at && (
                    <div className="hidden sm:flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <CountdownTicker targetDateISO={project.selection_ends_at} compact />
                    </div>
                  )}
                  <Button size="sm" variant={hasBid ? 'outline' : 'default'} asChild>
                    <Link href={`/dashboard/builder/bid/${project.id}`}>
                      {hasBid ? 'Update Bid' : 'Submit Bid'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile photo */}
      <BuilderProfileSettings
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
      />

      {/* Portfolio management */}
      <PortfolioManager builderId={userId} />

      {/* My bid history */}
      {myBids.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">My Bid History</h2>
          <div className="space-y-2">
            {myBids.slice(0, 10).map((bid) => {
              const project = projects.find((p) => p.id === bid.project_id);
              return (
                <div key={bid.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card/80 dark:bg-card/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{project?.title ?? 'Project'}</p>
                    <p className="text-xs text-muted-foreground">{project?.district ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{bid.total_sum_metric.toLocaleString('en-IN')}/sqft</p>
                    <p className="text-[10px] text-muted-foreground/80">{new Date(bid.created_at).toLocaleDateString('en-IN')}</p>
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

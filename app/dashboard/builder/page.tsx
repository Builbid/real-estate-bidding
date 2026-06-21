import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Award, Clock, CheckCircle2, ArrowRight, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { STATUS_CONFIG, TRACK_LABELS } from '@/lib/utils';
import { RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS } from '@/lib/types';
import type { Project, Bid } from '@/lib/types';

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'builder') redirect('/dashboard');

  // Get all active projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .in('status', ['active_24h', 'frozen_24h'])
    .order('bidding_ends_at', { ascending: true });

  // Get builder's own bids
  const { data: myBids } = await supabase
    .from('bids')
    .select('*')
    .eq('builder_id', user.id)
    .order('created_at', { ascending: false });

  return { profile, projects: (projects ?? []) as Project[], myBids: (myBids ?? []) as Bid[], userId: user.id };
}

export default async function BuilderDashboard() {
  const { profile, projects, myBids, userId } = await getData();

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const myBidMap       = new Map(myBids.map((b) => [b.project_id, b]));
  const bidsPlaced     = myBids.filter((b) => !b.is_withdrawn);
  const wins           = myBids.filter((b) => false); // wins would come from selected_builder_id checks

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Builder Console</h1>
        <p className="text-sm text-slate-400 mt-1">Welcome, <span className="text-white font-semibold">{profile.full_name}</span></p>
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
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
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
          <h2 className="text-base font-semibold text-white">Open Auctions</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {activeProjects.length}
          </span>
        </div>

        {activeProjects.length > 0 ? (
          <div className="space-y-3">
            {activeProjects.map((project) => {
              const myBid    = myBidMap.get(project.id);
              const hasBid   = !!myBid;
              const configLabel = project.track_type === 'RCC'
                ? project.sub_configuration.rcc_config ? RCC_CONFIG_LABELS[project.sub_configuration.rcc_config] : '—'
                : project.sub_configuration.assam_config ? ASSAM_CONFIG_LABELS[project.sub_configuration.assam_config] : '—';

              return (
                <div key={project.id} className={`flex items-center gap-4 p-4 rounded-xl border bg-slate-900/60 hover:border-slate-600 transition-colors ${hasBid ? 'border-indigo-500/30' : 'border-slate-800'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="emerald">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </Badge>
                      <Badge>{TRACK_LABELS[project.track_type]}</Badge>
                      {hasBid && <Badge variant="indigo">Your Bid: ₹{myBid.total_sum_metric.toLocaleString('en-IN')}/sqft</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{project.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{project.district}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500">{configLabel}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
                  </div>
                  <Button size="sm" variant={hasBid ? 'outline' : 'default'} asChild>
                    <Link href={`/dashboard/builder/bid/${project.id}`}>
                      {hasBid ? 'Update Bid' : 'Place Bid'} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center">
              <Building className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-1">No Open Auctions</p>
              <p className="text-xs text-slate-500">Check back soon — new projects are posted regularly.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* My bid history */}
      {myBids.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-400 mb-4">My Bid History</h2>
          <div className="space-y-2">
            {myBids.slice(0, 10).map((bid) => {
              const project = projects.find((p) => p.id === bid.project_id);
              return (
                <div key={bid.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{project?.title ?? 'Project'}</p>
                    <p className="text-xs text-slate-500">{project?.district ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₹{bid.total_sum_metric.toLocaleString('en-IN')}/sqft</p>
                    <p className="text-[10px] text-slate-600">{new Date(bid.created_at).toLocaleDateString('en-IN')}</p>
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

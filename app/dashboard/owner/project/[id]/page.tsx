import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, CheckCircle2, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { BidLeaderboard } from '@/components/shared/BidLeaderboard';
import { STATUS_CONFIG, TRACK_LABELS } from '@/lib/utils';
import { RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS } from '@/lib/types';
import type { Project, Bid, PublicProfile } from '@/lib/types';
import { SelectBuilderButton } from './SelectBuilderButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getData(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect('/login');

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single();
  if (!project) notFound();
  if (project.owner_id !== user.id) redirect('/dashboard/owner');

  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', id)
    .order('total_sum_metric', { ascending: true });

  // Fetch builder profiles for frozen/completed projects
  let builders: Record<string, PublicProfile> = {};
  if (project.status !== 'active_24h' && bids && bids.length > 0) {
    const builderIds = [...new Set(bids.map((b: Bid) => b.builder_id).filter(Boolean))] as string[];
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, role, full_name, created_at, mobile, email')
      .in('id', builderIds);
    if (profileData) {
      builders = Object.fromEntries(
        (profileData as unknown as PublicProfile[]).map((p) => [p.id, p])
      );
    }
  }

  return { project: project as Project, bids: (bids ?? []) as Bid[], builders, userId: user.id };
}

export default async function OwnerProjectPage({ params }: PageProps) {
  const { id } = await params;
  const { project, bids, builders } = await getData(id);

  const status    = STATUS_CONFIG[project.status];
  const isActive  = project.status === 'active_24h';
  const isFrozen  = project.status === 'frozen_24h';
  const isReveal  = !isActive;

  const configLabel = project.track_type === 'RCC'
    ? project.sub_configuration.rcc_config ? RCC_CONFIG_LABELS[project.sub_configuration.rcc_config] : '—'
    : project.sub_configuration.assam_config ? ASSAM_CONFIG_LABELS[project.sub_configuration.assam_config] : '—';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/owner" className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{project.district} · {configLabel}</p>
        </div>
        <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'} className="ml-auto">
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Full leaderboard with identities */}
        <div className="lg:col-span-2 space-y-5">
          {isFrozen && (
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
              <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-300 mb-1">Bidding Closed — Select Your Builder</p>
                <p className="text-xs text-indigo-400/70">
                  Review all bids below. Builder identities are now visible to you only. Select the builder who best fits your project requirements.
                </p>
              </div>
            </div>
          )}

          {isActive && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1.5 flex-shrink-0" />
              <p className="text-xs text-emerald-300">
                Live auction in progress. Builder identities are anonymized until bidding closes. Bids update in real-time.
              </p>
            </div>
          )}

          {/* Full bid table for owner */}
          {bids.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>All Bids ({bids.length})</span>
                  {isReveal && <span className="text-xs font-normal text-emerald-400">Builder profiles revealed</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bids.map((bid, index) => {
                    const builder = builders[bid.builder_id ?? ''];
                    const isSelected = project.selected_builder_id === bid.builder_id;
                    return (
                      <div key={bid.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isSelected ? 'border-emerald-500/40 bg-emerald-500/5' : index === 0 ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                        <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {isReveal && builder ? (
                            <>
                              <p className="text-sm font-semibold text-white">{builder.full_name}</p>
                              {'email' in builder && <p className="text-xs text-slate-500">{(builder as { email?: string }).email}</p>}
                            </>
                          ) : (
                            <p className="text-xs text-slate-600">Anonymous Builder</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-bold tabular-nums ${index === 0 ? 'text-emerald-400' : 'text-white'}`}>
                            ₹{bid.total_sum_metric.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-500">total /sqft</p>
                        </div>
                        {isFrozen && !project.selected_builder_id && bid.builder_id && (
                          <SelectBuilderButton projectId={project.id} builderId={bid.builder_id} builderName={builder?.full_name} />
                        )}
                        {isSelected && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-10 pb-10 text-center">
                <p className="text-sm text-slate-500">No bids received yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {isActive && (
            <Card className="border-emerald-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-emerald-400 uppercase tracking-wider">Closes In</CardTitle>
              </CardHeader>
              <CardContent>
                <CountdownTicker targetDateISO={project.bidding_ends_at} />
              </CardContent>
            </Card>
          )}

          {isFrozen && project.selection_ends_at && (
            <Card className="border-indigo-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-indigo-400 uppercase tracking-wider">Selection Closes In</CardTitle>
              </CardHeader>
              <CardContent>
                <CountdownTicker targetDateISO={project.selection_ends_at} />
              </CardContent>
            </Card>
          )}

          {project.selected_builder_id && builders[project.selected_builder_id] && (
            <Card className="border-emerald-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Selected Builder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base font-bold text-white">{builders[project.selected_builder_id]?.full_name}</p>
                <p className="text-xs text-emerald-400 mt-1">✓ Successfully selected</p>
              </CardContent>
            </Card>
          )}

          {/* Mini live leaderboard (anonymized) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Live Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <BidLeaderboard
                projectId={project.id}
                projectStatus={project.status}
                ownerId={project.owner_id}
                showIdentity={isReveal}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

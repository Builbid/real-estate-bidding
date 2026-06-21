import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building, MapPin, Layers, Calendar,
  Info, Lock, AlertTriangle
} from 'lucide-react';
import { PublicNavbar } from '@/components/shared/Navbar';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { BidLeaderboard } from '@/components/shared/BidLeaderboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_CONFIG, TRACK_LABELS } from '@/lib/utils';
import { RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS } from '@/lib/types';
import type { Project } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*').eq('id', id).single();
  return data as Project | null;
}

async function getBidCount(projectId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from('bids').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
  return count ?? 0;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [project, bidCount] = await Promise.all([getProject(id), getBidCount(id)]);

  if (!project) notFound();

  const status    = STATUS_CONFIG[project.status];
  const isActive  = project.status === 'active_24h';
  const isFrozen  = project.status === 'frozen_24h';

  const configLabel =
    project.track_type === 'RCC'
      ? project.sub_configuration.rcc_config ? RCC_CONFIG_LABELS[project.sub_configuration.rcc_config] : '—'
      : project.sub_configuration.assam_config ? ASSAM_CONFIG_LABELS[project.sub_configuration.assam_config] : '—';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Auctions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                    <Building className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'}>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {status.label}
                      </Badge>
                      <Badge>{TRACK_LABELS[project.track_type]}</Badge>
                    </div>
                    <h1 className="text-xl font-bold text-white leading-snug mb-1">{project.title}</h1>
                    {project.description && (
                      <p className="text-sm text-slate-400 leading-relaxed">{project.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4 text-slate-400" />
                  Engineering Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <SpecItem icon={MapPin} label="District" value={project.district} />
                  <SpecItem icon={MapPin} label="State" value={project.state} />
                  <SpecItem icon={Layers} label="Track" value={TRACK_LABELS[project.track_type]} />
                  <SpecItem icon={Layers} label="Configuration" value={configLabel} />
                  {project.plot_area_sqft && (
                    <SpecItem icon={Layers} label="Plot Area" value={`${project.plot_area_sqft.toLocaleString()} sqft`} />
                  )}
                  <SpecItem icon={Layers} label="Total Floors" value={
                    project.total_floors === 1 ? 'Ground Only'
                    : project.total_floors === 2 ? 'G+1'
                    : 'G+2'
                  } />
                  <SpecItem icon={Calendar} label="Posted On" value={new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                </div>
              </CardContent>
            </Card>

            {isActive && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300 mb-1">Active Bidding Phase</p>
                  <p className="text-xs text-amber-400/70">
                    Builder identities are anonymized until the auction closes. The project owner can only see full builder profiles after the bidding period ends.
                  </p>
                </div>
              </div>
            )}

            {isFrozen && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-300 mb-1">Bidding Closed — Selection Phase</p>
                  <p className="text-xs text-indigo-400/70 mb-3">
                    The 24-hour bidding window has ended. If you are the project owner, sign in to view full builder profiles and select your builder.
                  </p>
                  <Button size="sm" variant="indigo" asChild>
                    <Link href="/login">Sign In to Select Builder</Link>
                  </Button>
                </div>
              </div>
            )}

            {isActive && (
              <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                <p className="text-sm font-semibold text-white mb-2">Are you a registered builder?</p>
                <p className="text-xs text-slate-400 mb-4">Sign in to submit your competitive rate bid for this project.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button size="sm" asChild>
                    <Link href="/login">Sign In to Bid</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/register">Register as Builder</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {isActive && (
              <Card className="border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-sm text-emerald-400 uppercase tracking-wider">Bidding Closes In</CardTitle>
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

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-1">{bidCount}</p>
                  <p className="text-xs text-slate-400">Builders have bid on this project</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bid Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <BidLeaderboard
                  projectId={project.id}
                  projectStatus={project.status}
                  ownerId={project.owner_id}
                  showIdentity={false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-200 leading-snug">{value}</p>
      </div>
    </div>
  );
}

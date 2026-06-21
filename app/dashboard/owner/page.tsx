import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Building, TrendingUp, Users, Clock, ArrowRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { STATUS_CONFIG, TRACK_LABELS } from '@/lib/utils';
import { RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS } from '@/lib/types';
import type { Project } from '@/lib/types';

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'owner') redirect('/dashboard');

  const { data: projects } = await supabase
    .from('projects')
    .select('*, bids(count)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return { profile, projects: (projects ?? []) as (Project & { bids: [{ count: number }] })[] };
}

export default async function OwnerDashboard() {
  const { profile, projects } = await getData();

  const active    = projects.filter((p) => p.status === 'active_24h');
  const frozen    = projects.filter((p) => p.status === 'frozen_24h');
  const completed = projects.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Owner Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Welcome back, <span className="text-white font-semibold">{profile.full_name}</span></p>
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
          { label: 'Active Bids', value: active.length, icon: TrendingUp, color: 'emerald' },
          { label: 'Awaiting Selection', value: frozen.length, icon: Clock, color: 'indigo' },
          { label: 'Completed', value: completed.length, icon: Building, color: 'teal' },
          { label: 'Total Projects', value: projects.length, icon: Layers, color: 'slate' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
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

      {/* Active projects requiring attention */}
      {frozen.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <h2 className="text-base font-semibold text-white">Action Required — Select a Builder</h2>
          </div>
          <div className="space-y-3">
            {frozen.map((project) => (
              <ProjectRow key={project.id} project={project} bidCount={project.bids?.[0]?.count ?? 0} priority />
            ))}
          </div>
        </div>
      )}

      {/* Active auctions */}
      {active.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-semibold text-white">Live Auctions</h2>
          </div>
          <div className="space-y-3">
            {active.map((project) => (
              <ProjectRow key={project.id} project={project} bidCount={project.bids?.[0]?.count ?? 0} />
            ))}
          </div>
        </div>
      )}

      {/* All projects */}
      {projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4 text-center">
            <Building className="w-10 h-10 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">No Projects Yet</p>
              <p className="text-xs text-slate-500">Post your first construction project and start receiving competitive bids.</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/owner/new-project"><Plus className="w-4 h-4" /> Post First Project</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed projects */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-400 mb-4">Completed Projects</h2>
          <div className="space-y-3">
            {completed.map((project) => (
              <ProjectRow key={project.id} project={project} bidCount={project.bids?.[0]?.count ?? 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, bidCount, priority }: {
  project: Project; bidCount: number; priority?: boolean;
}) {
  const status     = STATUS_CONFIG[project.status];
  const isActive   = project.status === 'active_24h';
  const isFrozen   = project.status === 'frozen_24h';
  const configLabel =
    project.track_type === 'RCC'
      ? project.sub_configuration.rcc_config ? RCC_CONFIG_LABELS[project.sub_configuration.rcc_config] : '—'
      : project.sub_configuration.assam_config ? ASSAM_CONFIG_LABELS[project.sub_configuration.assam_config] : '—';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border bg-slate-900/60 transition-colors hover:border-slate-600 ${priority ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-800'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'}>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            {status.label}
          </Badge>
          <Badge>{TRACK_LABELS[project.track_type]}</Badge>
        </div>
        <p className="text-sm font-semibold text-white truncate">{project.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500">{project.district}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-500">{configLabel}</span>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3 h-3" />
            {bidCount} bid{bidCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 hidden sm:block">
        {isActive && <CountdownTicker targetDateISO={project.bidding_ends_at} compact />}
        {isFrozen && project.selection_ends_at && (
          <CountdownTicker targetDateISO={project.selection_ends_at} compact />
        )}
      </div>

      <Button size="sm" variant={isFrozen ? 'indigo' : 'outline'} asChild>
        <Link href={`/dashboard/owner/project/${project.id}`}>
          {isFrozen ? 'Select Builder' : 'View'} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </div>
  );
}

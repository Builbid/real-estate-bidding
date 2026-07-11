export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import {
  Shield, Users, Building, TrendingUp, AlertTriangle,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminServiceTables } from './AdminServiceTables';
import type { Project, Profile } from '@/lib/types';

async function getData() {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? { id: userId, email, full_name: fullName, role, mobile: null, physical_address: null, pincode: null, created_at: '', updated_at: '' };
  if (profile.role !== 'admin') redirect('/dashboard');

  const [
    { data: allProjects },
    { data: allProfiles },
    { data: recentBids },
    { count: totalBids },
  ] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('bids').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('bids').select('*', { count: 'exact', head: true }),
  ]);

  return {
    profile,
    projects:    (allProjects ?? [])  as Project[],
    profiles:    (allProfiles ?? [])  as Profile[],
    recentBids:  recentBids ?? [],
    totalBids:   totalBids ?? 0,
  };
}

export default async function AdminDashboard() {
  const { profile, projects, profiles, recentBids, totalBids } = await getData();

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const frozenProjects = projects.filter((p) => p.status === 'frozen_24h');
  const owners   = profiles.filter((p) => p.role === 'owner');
  const bidders = profiles.filter((p) => p.role === 'labour_contractor' || p.role === 'construction_firm');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Control Center</h1>
          <p className="text-sm text-muted-foreground">Logged in as <span className="text-indigo-300 font-semibold">{profile.full_name}</span></p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, icon: Building, color: 'emerald' },
          { label: 'Active Auctions', value: activeProjects.length, icon: Activity, color: 'emerald' },
          { label: 'Registered Users', value: profiles.length, icon: Users, color: 'indigo' },
          { label: 'Total Bids Cast', value: totalBids, icon: TrendingUp, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {frozenProjects.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {frozenProjects.length} project{frozenProjects.length > 1 ? 's' : ''} in selection phase
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              These projects have completed bidding and are awaiting owner selection. Monitor for abandoned selections.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              All Projects
              <span className="ml-auto text-xs font-normal text-muted-foreground">Last 50</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminServiceTables
              projects={projects}
              profiles={profiles}
              recentBids={recentBids}
            />
          </CardContent>
        </Card>

        {/* Users */}
        <div className="space-y-5">
          {/* Firm profiles + bid filters handled in AdminServiceTables above */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Registered Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="px-3 py-2.5 rounded-lg bg-teal-500/5 border border-teal-500/15 text-center">
                  <p className="text-lg font-bold text-foreground">{owners.length}</p>
                  <p className="text-[10px] text-teal-400 uppercase tracking-wider">Clients</p>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-center">
                  <p className="text-lg font-bold text-foreground">{bidders.length}</p>
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider">Bidders</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-background flex-shrink-0">
                      {(p.company_name ?? p.full_name)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{p.company_name ?? p.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <Badge variant={p.role === 'owner' ? 'teal' : p.role === 'admin' ? 'indigo' : p.role === 'construction_firm' ? 'violet' : 'emerald'} className="text-[10px]">
                      {p.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

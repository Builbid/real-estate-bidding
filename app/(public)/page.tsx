import { createClient } from '@/lib/supabase/server';
import { PublicNavbar } from '@/components/shared/Navbar';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Building2, TrendingUp, Shield, Zap, Users, ArrowRight,
  MapPin, Activity
} from 'lucide-react';
import type { Project } from '@/lib/types';

async function getProjects() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('*')
    .in('status', ['active_24h', 'frozen_24h'])
    .order('created_at', { ascending: false })
    .limit(12);
  return (data ?? []) as Project[];
}

async function getStats() {
  const supabase = await createClient();
  const [{ count: totalProjects }, { count: activeBids }] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('bids').select('*', { count: 'exact', head: true }),
  ]);
  return { totalProjects: totalProjects ?? 0, activeBids: activeBids ?? 0 };
}

const FEATURES = [
  {
    icon: Shield,
    title: 'Privacy-First Architecture',
    description: 'Builder identities are anonymized during live bidding. Owner details are never exposed.',
    color: 'emerald',
  },
  {
    icon: Zap,
    title: 'Real-Time Leaderboard',
    description: 'Live bid rankings update instantly via Supabase Realtime — no refresh needed.',
    color: 'amber',
  },
  {
    icon: TrendingUp,
    title: 'Market-Driven Rates',
    description: 'Competitive per-sqft rate bidding across RCC and Assam-type construction tracks.',
    color: 'indigo',
  },
  {
    icon: Users,
    title: 'Multi-Role Workflows',
    description: 'Separate, purpose-built dashboards for Project Owners, Builders, and Admins.',
    color: 'teal',
  },
];

export default async function HomePage() {
  const [projects, stats] = await Promise.all([getProjects(), getStats()]);

  const activeProjects = projects.filter((p) => p.status === 'active_24h');
  const frozenProjects = projects.filter((p) => p.status === 'frozen_24h');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {stats.totalProjects} Projects · {stats.activeBids} Active Bids
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
              The Professional{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Construction Bidding
              </span>{' '}
              Platform
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Post real estate projects, receive competitive rate-based bids from verified builders,
              and make data-driven selection decisions — all within a transparent, timed auction framework.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" asChild>
                <Link href="/register">
                  Start Posting Projects <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/register">I&apos;m a Builder →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Active Auctions', value: activeProjects.length, icon: Activity, color: 'emerald' },
            { label: 'Pending Selection', value: frozenProjects.length, icon: Shield, color: 'indigo' },
            { label: 'Total Projects', value: stats.totalProjects, icon: Building2, color: 'teal' },
            { label: 'Bids Submitted', value: stats.activeBids, icon: TrendingUp, color: 'amber' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Auction Feed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {activeProjects.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white">Live Auctions</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {activeProjects.length} open
                </span>
              </div>
              <Link href="/register" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                Bid Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeProjects.map((project) => (
                <ProjectCard key={project.id} project={project} isAuthenticated={false} />
              ))}
            </div>
          </div>
        )}

        {frozenProjects.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <h2 className="text-xl font-bold text-white">Selection Phase</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                {frozenProjects.length} projects
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {frozenProjects.map((project) => (
                <ProjectCard key={project.id} project={project} isAuthenticated={false} />
              ))}
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Active Projects</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Be the first to post a project. The live feed will appear here.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/register">Post a Project</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Built for Professional Construction Procurement
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every feature is designed around the actual workflow of real estate project bidding in Assam and beyond.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
                <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-10 text-center">
          <Building2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Ready to start bidding?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Create your free account in under 2 minutes. No government ID or OTP required.
          </p>
          <Button size="xl" asChild>
            <Link href="/register">Create Free Account <ArrowRight className="w-5 h-5" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">BidEstate Platform</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 text-xs">
            <MapPin className="w-3 h-3" />
            <span>Built for Assam Real Estate Ecosystem</span>
          </div>
          <p className="text-xs text-slate-600">© 2026 BidEstate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, LayoutDashboard, Building, HardHat,
  Shield, LogOut, Menu, Bell, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  return profile;
}

const NAV_ITEMS = {
  owner: [
    { href: '/dashboard/owner',              icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/owner/new-project',  icon: Building,        label: 'Post Project' },
  ],
  builder: [
    { href: '/dashboard/builder',            icon: LayoutDashboard, label: 'Overview' },
  ],
  admin: [
    { href: '/dashboard/admin',              icon: Shield,          label: 'Control Center' },
    { href: '/dashboard/owner',              icon: Building,        label: 'Projects (All)' },
  ],
} as const;

const ROLE_CONFIG = {
  owner:   { label: 'Project Owner', color: 'teal'    as const, icon: Building  },
  builder: { label: 'Builder',       color: 'emerald' as const, icon: HardHat   },
  admin:   { label: 'Admin',         color: 'indigo'  as const, icon: Shield    },
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const profile   = await getUser();
  const role      = profile.role as 'owner' | 'builder' | 'admin';
  const navItems  = NAV_ITEMS[role] ?? NAV_ITEMS.builder;
  const roleConfig = ROLE_CONFIG[role];

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-slate-800 bg-slate-900/50">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-white">BidEstate</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Platform</span>
          </div>
        </div>

        {/* User profile chip */}
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-slate-900 flex-shrink-0">
              {profile.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile.full_name}</p>
              <Badge variant={roleConfig.color} className="text-[9px] py-0 self-start">{roleConfig.label}</Badge>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors group"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-800 mt-3">
            <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
              <Building2 className="w-4 h-4" />
              <span>Public Feed</span>
            </Link>
          </div>
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-slate-800">
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors w-full text-left">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-4 h-14 px-4 sm:px-6 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="lg:hidden flex items-center gap-2">
            <Menu className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-slate-900">
              {profile.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

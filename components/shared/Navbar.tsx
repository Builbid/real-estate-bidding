'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, LayoutDashboard, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROLE_LABELS = { owner: 'Project Owner', builder: 'Builder', admin: 'Admin' } as const;
const ROLE_BADGES = { owner: 'teal', builder: 'emerald', admin: 'indigo' } as const;

export function Navbar() {
  const router      = useRouter();
  const { profile } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase    = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 group-hover:bg-emerald-500/20 transition-colors">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold text-white tracking-tight">BidEstate</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Platform</span>
          </div>
        </Link>

        {/* Center nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
            Live Auctions
          </Link>
          {profile && (
            <Link href="/dashboard" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {profile ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-slate-900">
                  {profile.full_name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-semibold text-white">{profile.full_name}</span>
                  <Badge variant={ROLE_BADGES[profile.role]} className="mt-0.5 text-[10px] py-0">
                    {ROLE_LABELS[profile.role]}
                  </Badge>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 flex flex-col gap-2">
          <Link href="/" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            Live Auctions
          </Link>
          {profile ? (
            <>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                Dashboard
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                Sign In
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-slate-800 transition-colors">
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

// Minimal public navbar (no auth state)
export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-white tracking-tight">BidEstate</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Platform</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

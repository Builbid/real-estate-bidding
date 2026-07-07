'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/lib/hooks/useProfile';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ProfileDrawer } from '@/components/shared/ProfileDrawer';
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  CreateAccountDropdownMenu,
  CreateAccountPopover,
} from '@/components/shared/CreateAccountDropdown';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';
import { normalizeRole, getDashboardPath } from '@/lib/auth/roles';

const ROLE_BADGES: Record<string, 'amber' | 'teal' | 'indigo' | 'violet'> = {
  owner: 'amber',
  labour_contractor: 'teal',
  construction_firm: 'violet',
  admin: 'indigo',
};

const ROLE_AVATAR: Record<string, string> = {
  owner: 'from-amber-400 to-orange-500',
  labour_contractor: 'from-blue-400 to-cyan-500',
  construction_firm: 'from-violet-400 to-indigo-600',
  admin: 'from-violet-400 to-indigo-600',
};

interface NavbarProps {
  overlay?: boolean;
}

export function Navbar({ overlay = false }: NavbarProps) {
  const router      = useRouter();
  const { profile, clearProfile } = useProfile();
  const { t }       = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const supabase    = createClient();

  const normalizedRole = profile ? normalizeRole(profile.role) : null;
  const roleLabel = normalizedRole ? t(`roles.${normalizedRole}` as 'roles.owner') : '';

  async function handleSignOut() {
    clearProfile();
    setProfileOpen(false);
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const avatarGradient = normalizedRole ? (ROLE_AVATAR[normalizedRole] ?? ROLE_AVATAR.labour_contractor) : '';

  return (
    <header
      className={cn(
        'top-0 z-50 w-full',
        overlay
          ? 'absolute bg-transparent'
          : 'sticky border-b border-border/80 bg-background/95 backdrop-blur-xl'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          aria-label="BuilBid Home"
          className="flex items-center gap-2.5 group cursor-pointer hover:opacity-80 transition-opacity no-underline"
        >
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-violet-500/10 border border-violet-500/30 group-hover:bg-violet-500/20 transition-colors">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400" />
          </div>
          <span
            className={cn(
              'hidden sm:block text-xl sm:text-2xl font-bold tracking-tight',
              overlay ? 'text-slate-100' : 'text-foreground',
            )}
          >
            BuilBid
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3 sm:gap-4">
          {profile ? (
            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="rounded-full hover:ring-2 hover:ring-border transition-all flex-shrink-0"
                aria-label="Open profile"
              >
                <UserAvatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  size="xs"
                  gradient={avatarGradient}
                  className="!h-8 !w-8 text-xs ring-1 ring-border"
                />
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSignOutOpen(true)}
                title={t('common.signOut')}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : overlay ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-2 py-1 text-sm font-medium text-slate-200 hover:text-white transition-colors"
              >
                {t('common.signIn')}
              </Link>
              <CreateAccountPopover />
            </div>
          ) : (
            <Button
              asChild
              className="hidden md:inline-flex"
            >
              <Link href="/login">{t('common.signIn')}</Link>
            </Button>
          )}

          {!profile && overlay && (
            <CreateAccountPopover compact triggerClassName="sm:hidden" />
          )}

          {profile && overlay && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="sm:hidden h-8 rounded-full px-3 text-xs border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={getDashboardPath(normalizedRole!)}>{t('common.dashboard')}</Link>
            </Button>
          )}

          <ThemeToggle
            className={
              overlay
                ? 'border-white/30 text-slate-100 hover:bg-white/10 hover:text-white'
                : undefined
            }
          />

          {/* Mobile: avatar initial */}
          {profile && (
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="rounded-full hover:ring-2 hover:ring-border transition-all flex-shrink-0"
                aria-label="Open profile"
              >
                <UserAvatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  size="xs"
                  gradient={avatarGradient}
                />
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className={cn(
              'md:hidden p-2 rounded-lg transition-colors',
              overlay
                ? 'text-slate-200 hover:text-white hover:bg-white/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background flex flex-col">
          {/* Logged-in user chip */}
          {profile && (
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/80 dark:bg-card/60">
              <UserAvatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                size="sm"
                gradient={avatarGradient}
                className="flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">{profile.full_name}</span>
                <Badge variant={ROLE_BADGES[normalizedRole ?? 'labour_contractor']} className="mt-0.5 text-[10px] py-0 self-start">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          )}

          <div className="px-4 py-3 flex flex-col gap-1">
            {profile ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors">
                  <LayoutDashboard className="w-4 h-4 text-violet-400" /> {t('common.dashboard')}
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); setSignOutOpen(true); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" /> {t('common.signOut')}
                </button>
              </>
            ) : overlay ? (
              <CreateAccountDropdownMenu
                onNavigate={() => setMenuOpen(false)}
                itemClassName="px-3 py-2.5 text-foreground/80 hover:text-foreground rounded-lg"
              />
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors">
                {t('common.signIn')}
              </Link>
            )}
          </div>
        </div>
      )}

      <SignOutConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={handleSignOut}
      />

      {profile && (
        <ProfileDrawer
          open={profileOpen}
          onOpenChange={setProfileOpen}
          profile={profile}
          avatarGradient={avatarGradient}
          onSignOut={() => {
            setProfileOpen(false);
            setSignOutOpen(true);
          }}
        />
      )}
    </header>
  );
}

// Minimal public navbar (no auth state) — kept for backward-compat but home page uses <Navbar>
export function PublicNavbar() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        <Link
          href="/"
          aria-label="BuilBid Home"
          className="flex items-center gap-2.5 group cursor-pointer hover:opacity-80 transition-opacity no-underline"
        >
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-violet-500/10 border border-violet-500/30 group-hover:bg-violet-500/20 transition-colors">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">BuilBid</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Button asChild><Link href="/login">{t('common.signIn')}</Link></Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

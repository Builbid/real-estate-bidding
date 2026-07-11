'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Building2, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ProfileDrawer } from '@/components/shared/ProfileDrawer';
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog';
import { NavLink } from '@/components/shared/NavLink';
import { NavIconButton } from '@/components/shared/NavIconButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { CreateAccountButton } from '@/components/shared/CreateAccountButton';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';
import { normalizeRole, getDashboardPath } from '@/lib/auth/roles';
import { clientSignOut } from '@/lib/auth/clientSignOut';
import { NAV_LOGO_LINK, NAV_MENU_ITEM } from '@/lib/navStyles';

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
  /** Server-verified session hint — keeps navbar logged-in after dashboard → home navigation */
  authHint?: { isAuthenticated: boolean; role: string | null };
}

export function Navbar({ overlay = false, authHint }: NavbarProps) {
  const router      = useRouter();
  const { profile, clearProfile, refreshProfile } = useProfile();
  const { t }       = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    if (authHint?.isAuthenticated && !profile) {
      void refreshProfile();
    }
  }, [authHint, profile, refreshProfile]);

  const isLoggedIn = Boolean(profile) || Boolean(authHint?.isAuthenticated);
  const normalizedRole = profile
    ? normalizeRole(profile.role)
    : authHint?.role
      ? normalizeRole(authHint.role)
      : null;
  const roleLabel = normalizedRole ? t(`roles.${normalizedRole}` as 'roles.owner') : '';

  function handleSignOut() {
    setProfileOpen(false);
    setMenuOpen(false);
    clientSignOut(router, { onClear: clearProfile });
  }

  const avatarGradient = normalizedRole ? (ROLE_AVATAR[normalizedRole] ?? ROLE_AVATAR.labour_contractor) : '';

  return (
    <header
      className={cn(
        'top-0 z-50 w-full',
        overlay
          ? 'absolute bg-transparent'
          : 'sticky border-b border-border/70 bg-background/90 backdrop-blur-xl shadow-sm shadow-black/[0.04]'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">

        {/* Logo */}
        <NavLink
          href="/"
          prefetch
          aria-label="BuilBid Home"
          className={cn(NAV_LOGO_LINK, 'hover:opacity-90')}
        >
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-violet-500/10 border border-violet-500/30 group-hover:bg-violet-500/20 group-hover:shadow-md group-hover:shadow-violet-500/10 transition-all group-active:opacity-80">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400" />
          </div>
          <span
            className={cn(
              'hidden sm:block text-xl sm:text-2xl font-bold tracking-tight',
              'text-foreground',
            )}
          >
            BuilBid
          </span>
        </NavLink>

        {/* Right side */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-3">
              <NavIconButton
                onClick={() => setProfileOpen(true)}
                className="rounded-full hover:ring-2 hover:ring-border flex-shrink-0"
                aria-label="Open profile"
              >
                <UserAvatar
                  name={profile?.full_name ?? 'User'}
                  avatarUrl={profile?.avatar_url}
                  size="xs"
                  gradient={avatarGradient}
                  className="!h-8 !w-8 text-xs ring-1 ring-border"
                />
              </NavIconButton>
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
            <div className="hidden md:flex items-center gap-2">
              <NavLink
                href="/login"
                prefetch
                className="px-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                {t('common.signIn')}
              </NavLink>
              <CreateAccountButton />
            </div>
          ) : (
            <Button
              asChild
              className="hidden md:inline-flex"
            >
              <Link href="/login" prefetch>{t('common.signIn')}</Link>
            </Button>
          )}

          {isLoggedIn && overlay && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="sm:hidden h-8 rounded-full px-3 text-xs border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
            >
              <Link href={getDashboardPath(normalizedRole!)} prefetch>{t('common.dashboard')}</Link>
            </Button>
          )}

          <ThemeToggle
            className={
              overlay
                ? 'border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900'
                : undefined
            }
          />

          {/* Mobile: avatar initial */}
          {isLoggedIn && (
            <div className="md:hidden">
              <NavIconButton
                onClick={() => setProfileOpen(true)}
                className="rounded-full hover:ring-2 hover:ring-border flex-shrink-0"
                aria-label="Open profile"
              >
                <UserAvatar
                  name={profile?.full_name ?? 'User'}
                  avatarUrl={profile?.avatar_url}
                  size="xs"
                  gradient={avatarGradient}
                />
              </NavIconButton>
            </div>
          )}

          {/* Mobile menu toggle */}
          <NavIconButton
            className={cn(
              'md:hidden p-2',
              overlay
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </NavIconButton>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background flex flex-col">
          {/* Logged-in user chip */}
          {isLoggedIn && (
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/80 dark:bg-card/60">
              <UserAvatar
                name={profile?.full_name ?? 'User'}
                avatarUrl={profile?.avatar_url}
                size="sm"
                gradient={avatarGradient}
                className="flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">{profile?.full_name ?? 'User'}</span>
                <Badge variant={ROLE_BADGES[normalizedRole ?? 'labour_contractor']} className="mt-0.5 text-[10px] py-0 self-start">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          )}

          <div className="px-4 py-3 flex flex-col gap-1">
            {isLoggedIn ? (
              <>
                <NavLink
                  href={normalizedRole ? getDashboardPath(normalizedRole) : '/dashboard'}
                  prefetch
                  onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-accent')}
                >
                  <LayoutDashboard className="w-4 h-4 text-violet-400" /> {t('common.dashboard')}
                </NavLink>
                <NavIconButton
                  onClick={() => { setMenuOpen(false); setSignOutOpen(true); }}
                  className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-accent w-full text-left')}
                >
                  <LogOut className="w-4 h-4" /> {t('common.signOut')}
                </NavIconButton>
              </>
            ) : overlay ? (
              <>
                <NavLink
                  href="/signup"
                  prefetch
                  onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex min-h-11 items-center px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent')}
                >
                  {t('common.createAccount')}
                </NavLink>
                <NavLink
                  href="/login"
                  prefetch
                  onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex min-h-11 items-center px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-accent')}
                >
                  {t('common.signIn')}
                </NavLink>
              </>
            ) : (
              <NavLink
                href="/login"
                prefetch
                onClick={() => setMenuOpen(false)}
                className={cn(NAV_MENU_ITEM, 'px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-accent')}
              >
                {t('common.signIn')}
              </NavLink>
            )}
          </div>
        </div>
      )}

      <SignOutConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={handleSignOut}
      />

      {isLoggedIn && profile && (
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
        <NavLink
          href="/"
          prefetch
          aria-label="BuilBid Home"
          className={cn(NAV_LOGO_LINK, 'hover:opacity-90')}
        >
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-violet-500/10 border border-violet-500/30 group-hover:bg-violet-500/20 group-hover:shadow-md group-hover:shadow-violet-500/10 transition-all">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">BuilBid</span>
        </NavLink>
        <div className="flex items-center gap-3 sm:gap-4">
          <Button asChild><Link href="/login" prefetch>{t('common.signIn')}</Link></Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

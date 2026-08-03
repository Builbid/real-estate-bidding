'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { useProfile } from '@/lib/hooks/useProfile';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ProfileDrawer } from '@/components/shared/ProfileDrawer';
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog';
import { NavLink } from '@/components/shared/NavLink';
import { NavIconButton } from '@/components/shared/NavIconButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { CreateAccountButton } from '@/components/shared/CreateAccountButton';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';
import { normalizeRole, getDashboardPath } from '@/lib/auth/roles';
import { getProfileRoleLabel } from '@/lib/auth/profileRoleLabel';
import { clientSignOut } from '@/lib/auth/clientSignOut';
import { NAV_LOGO_LINK, NAV_MENU_ITEM } from '@/lib/navStyles';
import { PUBLIC_NAV_LINKS } from '@/lib/nav/publicLinks';

const ROLE_BADGES: Record<string, 'amber' | 'teal' | 'indigo' | 'violet' | 'emerald'> = {
  owner: 'amber',
  labour_contractor: 'teal',
  construction_firm: 'violet',
  admin: 'indigo',
  service_provider: 'emerald',
};

const ROLE_AVATAR: Record<string, string> = {
  owner: 'from-amber-400 to-orange-500',
  labour_contractor: 'from-blue-400 to-cyan-500',
  construction_firm: 'from-violet-400 to-indigo-600',
  admin: 'from-violet-400 to-indigo-600',
  service_provider: 'from-emerald-400 to-teal-500',
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authHint?.isAuthenticated && !profile) {
      void refreshProfile();
    }
  }, [authHint, profile, refreshProfile]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    if (menuOpen) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [menuOpen]);

  const isLoggedIn = Boolean(profile) || Boolean(authHint?.isAuthenticated);
  const normalizedRole = profile
    ? normalizeRole(profile.role)
    : authHint?.role
      ? normalizeRole(authHint.role)
      : null;
  const roleLabel = profile
    ? getProfileRoleLabel(profile, t)
    : normalizedRole
      ? t(`roles.${normalizedRole}` as 'roles.owner')
      : '';

  async function handleSignOut() {
    setProfileOpen(false);
    setMenuOpen(false);
    await clientSignOut(router, { onClear: clearProfile });
  }

  const avatarGradient = normalizedRole ? (ROLE_AVATAR[normalizedRole] ?? ROLE_AVATAR.labour_contractor) : '';

  return (
    <>
    <header
      className={cn(
        'sticky top-0 z-[200] w-full isolate pointer-events-auto',
        overlay
          ? 'border-b border-slate-200/80 bg-white/95 backdrop-blur-md text-slate-900'
          : 'border-b border-border/70 bg-background/95 backdrop-blur-xl shadow-sm shadow-black/[0.04]'
      )}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <NavLink
          href="/"
          prefetch
          aria-label="BuilBid Home"
          className={cn(
            NAV_LOGO_LINK,
            overlay ? 'text-slate-900 hover:opacity-90' : 'text-foreground hover:opacity-90',
          )}
        >
          <BuilBidLogo size="md" compact className="sm:hidden" />
          <BuilBidLogo size="md" className="hidden sm:inline-flex" />
        </NavLink>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex">
          {PUBLIC_NAV_LINKS.map(({ href, labelKey }) => (
            <NavLink
              key={href}
              href={href}
              prefetch
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                overlay
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

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
                className={overlay ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100' : undefined}
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
              className="hidden h-8 rounded-full px-3 text-xs border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 min-[480px]:inline-flex lg:hidden"
            >
              <Link href={getDashboardPath(normalizedRole!)} prefetch>{t('common.dashboard')}</Link>
            </Button>
          )}

          <LanguageSwitcher overlay={overlay} />
          <ThemeToggle
            className={
              overlay
                ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                : undefined
            }
          />

          {/* Mobile menu toggle — keep top bar minimal so the button stays tappable */}
          <button
            type="button"
            className={cn(
              'inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-colors lg:hidden',
              overlay
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>

    {mounted && menuOpen && createPortal(
      <div className="fixed inset-0 z-[180] flex lg:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />

        <aside
          id="mobile-nav-menu"
          className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-bold text-foreground">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoggedIn && (
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <UserAvatar
                name={profile?.full_name ?? 'User'}
                avatarUrl={profile?.avatar_url}
                size="sm"
                gradient={avatarGradient}
                className="flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{profile?.full_name ?? 'User'}</p>
                <Badge variant={ROLE_BADGES[normalizedRole ?? 'labour_contractor']} className="mt-0.5 self-start py-0 text-[10px]">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          )}

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('nav.navigation')}
            </p>
            {PUBLIC_NAV_LINKS.map(({ href, labelKey }) => (
              <NavLink
                key={href}
                href={href}
                prefetch
                onClick={() => setMenuOpen(false)}
                className={cn(NAV_MENU_ITEM, 'flex min-h-11 items-center px-3 py-3 text-sm text-foreground hover:bg-accent')}
              >
                {t(labelKey)}
              </NavLink>
            ))}

            <div className="my-3 border-t border-border" />

            {isLoggedIn ? (
              <>
                <NavLink
                  href={normalizedRole ? getDashboardPath(normalizedRole) : '/dashboard'}
                  prefetch
                  onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-3 text-sm text-foreground hover:bg-accent')}
                >
                  <LayoutDashboard className="h-4 w-4 text-violet-400" />
                  {t('common.dashboard')}
                </NavLink>
                {profile && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                    className={cn(NAV_MENU_ITEM, 'flex w-full items-center gap-2.5 px-3 py-3 text-left text-sm text-foreground hover:bg-accent')}
                  >
                    <User className="h-4 w-4 text-violet-400" />
                    {t('nav.myProfile')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setSignOutOpen(true); }}
                  className={cn(NAV_MENU_ITEM, 'flex w-full items-center gap-2.5 px-3 py-3 text-left text-sm text-red-400 hover:bg-red-500/10')}
                >
                  <LogOut className="h-4 w-4" />
                  {t('common.signOut')}
                </button>
              </>
            ) : overlay ? (
              <>
                <NavLink
                  href="/signup"
                  prefetch
                  onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex min-h-11 items-center px-3 py-3 text-sm font-medium text-foreground hover:bg-accent')}
                >
                  {t('common.createAccount')}
                </NavLink>
                <NavLink
                  href="/login"
                  prefetch
                  onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex min-h-11 items-center px-3 py-3 text-sm text-foreground hover:bg-accent')}
                >
                  {t('common.signIn')}
                </NavLink>
              </>
            ) : (
              <NavLink
                href="/login"
                prefetch
                onClick={() => setMenuOpen(false)}
                className={cn(NAV_MENU_ITEM, 'flex min-h-11 items-center px-3 py-3 text-sm text-foreground hover:bg-accent')}
              >
                {t('common.signIn')}
              </NavLink>
            )}
          </nav>
        </aside>
      </div>,
      document.body,
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
    </>
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
          <BuilBidLogo size="md" />
        </NavLink>
        <div className="flex items-center gap-3 sm:gap-4">
          <Button asChild><Link href="/login" prefetch>{t('common.signIn')}</Link></Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

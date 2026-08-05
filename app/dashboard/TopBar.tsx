'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Menu, X, LayoutDashboard, Building,
  Shield, LogOut, Home, User, ChevronRight, Settings,
  CheckCheck, Trophy, Award, Bell,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { FirmLogo } from '@/components/firm/FirmLogo'
import { useNotifications, notificationText } from '@/lib/hooks/useNotifications'
import { useDashboardProfile } from '@/lib/context/ProfileProvider'
import { formatRelativeTime, cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { ProfileDrawer } from '@/components/shared/ProfileDrawer'
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog'
import { NavLink } from '@/components/shared/NavLink'
import { NavIconButton } from '@/components/shared/NavIconButton'
import { useTranslation } from '@/lib/context/LanguageProvider'
import { normalizeRole } from '@/lib/auth/roles'
import { isTradeServiceType, getTradeLabel } from '@/lib/trades'
import { clientSignOut } from '@/lib/auth/clientSignOut'
import { BuilBidLogo } from '@/components/shared/BuilBidLogo'
import { NAV_LOGO_LINK, NAV_MENU_ITEM } from '@/lib/navStyles'

interface ProfileData {
  id: string
  full_name: string
  email: string
  role: string
  mobile?: string | null
  physical_address?: string | null
  pincode?: string | null
  avatar_url?: string | null
  company_name?: string | null
  logo_url?: string | null
  service_type?: string | null
}

interface TopBarProps {
  profile: ProfileData
  roleColor: 'amber' | 'teal' | 'indigo' | 'violet' | 'emerald'
  avatarGradient: string
}

// Role badge colors aligned with the new palette
const ROLE_BADGES: Record<string, 'amber' | 'teal' | 'indigo' | 'violet' | 'emerald'> = {
  owner:              'amber',
  labour_contractor:  'teal',
  construction_firm:  'violet',
  admin:              'indigo',
  service_provider:   'emerald',
}

const NAV_ITEMS: Record<string, { href: string; icon: React.ComponentType<{ className?: string }>; labelKey: string }[]> = {
  owner: [
    { href: '/dashboard/owner',             icon: LayoutDashboard, labelKey: 'nav.overview' },
    { href: '/dashboard/owner/new-project', icon: Building,        labelKey: 'nav.postProject' },
  ],
  labour_contractor: [
    { href: '/dashboard/builder', icon: LayoutDashboard, labelKey: 'nav.overview' },
  ],
  construction_firm: [
    { href: '/dashboard/firm', icon: LayoutDashboard, labelKey: 'nav.overview' },
    { href: '/dashboard/firm/settings', icon: Settings, labelKey: 'nav.firmProfile' },
  ],
  admin: [
    { href: '/dashboard/admin', icon: Shield,   labelKey: 'nav.controlCenter' },
    { href: '/dashboard/owner', icon: Building, labelKey: 'nav.projectsAll' },
  ],
  service_provider: [
    { href: '/dashboard/provider', icon: LayoutDashboard, labelKey: 'nav.overview' },
  ],
}

const NOTIF_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  you_were_selected: Trophy,
  builder_selected:  Award,
}

export function TopBar({ profile, roleColor, avatarGradient }: TopBarProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const { profile: liveProfile, clearProfile } = useDashboardProfile()

  const displayProfile = liveProfile ?? profile
  const normalizedRole = normalizeRole(displayProfile.role)
  const isFirm = normalizedRole === 'construction_firm'
  const firmDisplayName = displayProfile.company_name ?? displayProfile.full_name
  const navItems   = NAV_ITEMS[normalizedRole] ?? NAV_ITEMS.labour_contractor
  const badgeColor = ROLE_BADGES[normalizedRole] ?? roleColor
  const roleLabel =
    normalizedRole === 'service_provider' && isTradeServiceType(displayProfile.service_type)
      ? getTradeLabel(displayProfile.service_type)
      : t(`roles.${normalizedRole}` as 'roles.owner')

  return (
    <>
      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center h-14 px-4 sm:px-6 border-b border-border bg-background/95 backdrop-blur gap-3">
        {/* Hamburger — visible on mobile */}
        <NavIconButton
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-accent lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </NavIconButton>

        {/* Mobile logo */}
        <NavLink
          href="/"
          prefetch
          aria-label="BuilBid Home"
          className={cn(NAV_LOGO_LINK, 'lg:hidden hover:opacity-90')}
        >
          <BuilBidLogo size="sm" compact className="sm:hidden" />
          <BuilBidLogo size="sm" className="hidden sm:inline-flex" />
        </NavLink>

        <div className="flex-1" />

        <ThemeToggle />

        {/* Bell */}
        <NavIconButton
          onClick={() => { setNotifOpen(true); }}
          className="relative w-9 h-9 border border-border text-muted-foreground hover:text-foreground hover:border-border"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavIconButton>

        {/* Avatar */}
        <NavIconButton
          onClick={() => setProfileOpen(true)}
          className="rounded-full hover:ring-2 hover:ring-white/20 flex-shrink-0"
          aria-label="Open profile"
        >
          {isFirm ? (
            <FirmLogo
              companyName={firmDisplayName}
              logoUrl={displayProfile.logo_url}
              size="sm"
              className="w-9 h-9"
            />
          ) : (
            <UserAvatar
              name={displayProfile.full_name}
              avatarUrl={displayProfile.avatar_url}
              size="header"
              gradient={avatarGradient}
            />
          )}
        </NavIconButton>
      </header>

      {/* ── Mobile sidebar drawer ─────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />

          <aside className="relative flex flex-col w-72 h-full bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <NavLink
                href="/"
                prefetch
                aria-label="BuilBid Home"
                onClick={() => setMenuOpen(false)}
                className={cn(NAV_LOGO_LINK, 'hover:opacity-90')}
              >
                <BuilBidLogo
                  size="sm"
                  showTagline
                  tagline="Platform"
                />
              </NavLink>
              <NavIconButton onClick={() => setMenuOpen(false)}
                className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Close menu">
                <X className="w-4 h-4" />
              </NavIconButton>
            </div>

            {/* User chip */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/60">
                <UserAvatar
                  name={displayProfile.full_name}
                  avatarUrl={displayProfile.avatar_url}
                  size="xs"
                  gradient={avatarGradient}
                  className="flex-shrink-0"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{displayProfile.full_name}</p>
                  <Badge variant={badgeColor} className="text-[9px] py-0 self-start">{roleLabel}</Badge>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{t('nav.navigation')}</p>
              {navItems.map(({ href, icon: Icon, labelKey }) => (
                <NavLink key={href} href={href} prefetch onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent group')}>
                  <Icon className="w-4 h-4 flex-shrink-0 text-violet-400" />
                  <span className="font-medium">{t(labelKey)}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                </NavLink>
              ))}

              <div className="pt-3 mt-3 border-t border-border space-y-1">
                <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{t('nav.more')}</p>
                <NavLink href="/" prefetch onClick={() => setMenuOpen(false)}
                  className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent')}>
                  <Home className="w-4 h-4 text-blue-400" />
                  <span>{t('nav.homePublicFeed')}</span>
                </NavLink>
                <NavIconButton onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                  className={cn(NAV_MENU_ITEM, 'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent text-left')}>
                  <User className="w-4 h-4 text-amber-400" />
                  <span>{t('nav.myProfile')}</span>
                </NavIconButton>
              </div>
            </nav>

            {/* Sign out */}
            <div className="px-3 py-4 border-t border-border">
              <NavIconButton
                type="button"
                onClick={() => { setMenuOpen(false); setSignOutOpen(true) }}
                className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 border border-transparent w-full text-left')}
              >
                <LogOut className="w-4 h-4" />
                <span>{t('common.signOut')}</span>
              </NavIconButton>
            </div>
          </aside>
        </div>
      )}

      {/* ── Notifications panel ───────────────────────────────── */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNotifOpen(false)} />

          <aside className="relative flex flex-col w-80 h-full bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 h-48 text-center px-6">
                  <Bell className="w-8 h-8 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif) => {
                    const IconComp = NOTIF_ICONS[notif.type] ?? Bell
                    return (
                      <button
                        key={notif.id}
                        onClick={() => markRead(notif.id)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors ${!notif.is_read ? 'bg-indigo-500/5' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${!notif.is_read ? 'bg-indigo-500/15 border border-indigo-500/25' : 'bg-secondary border border-border'}`}>
                          <IconComp className={`w-4 h-4 ${!notif.is_read ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-semibold leading-snug ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          {notificationText(notif) && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                              {notificationText(notif)}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/80 mt-1">
                            {formatRelativeTime(notif.created_at)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Profile panel ─────────────────────────────────────── */}
      <ProfileDrawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={displayProfile}
        avatarGradient={avatarGradient}
        onSignOut={() => {
          setProfileOpen(false)
          setSignOutOpen(true)
        }}
      />

      <SignOutConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={() => clientSignOut(router, { onClear: clearProfile })}
      />
    </>
  )
}

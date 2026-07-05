'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOutAction } from '@/app/actions/auth'
import {
  Menu, X, Building2, LayoutDashboard, Building,
  Shield, LogOut, Home, User, ChevronRight, Settings,
  CheckCheck, Trophy, Award, Bell,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { FirmLogo } from '@/components/firm/FirmLogo'
import { useNotifications, notificationText } from '@/lib/hooks/useNotifications'
import { useDashboardProfile } from '@/lib/context/ProfileProvider'
import { formatRelativeTime } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { ProfileDrawer } from '@/components/shared/ProfileDrawer'
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog'
import { useTranslation } from '@/lib/context/LanguageProvider'
import { normalizeRole } from '@/lib/auth/roles'

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
}

interface TopBarProps {
  profile: ProfileData
  roleColor: 'amber' | 'teal' | 'indigo' | 'violet'
  avatarGradient: string
}

// Role badge colors aligned with the new palette
const ROLE_BADGES: Record<string, 'amber' | 'teal' | 'indigo' | 'violet'> = {
  owner:              'amber',
  labour_contractor:  'teal',
  construction_firm:  'violet',
  admin:              'indigo',
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
}

const NOTIF_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  you_were_selected: Trophy,
  builder_selected:  Award,
}

export function TopBar({ profile, roleColor, avatarGradient }: TopBarProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const { profile: liveProfile } = useDashboardProfile()

  const displayProfile = liveProfile ?? profile
  const normalizedRole = normalizeRole(displayProfile.role)
  const isFirm = normalizedRole === 'construction_firm'
  const firmDisplayName = displayProfile.company_name ?? displayProfile.full_name
  const navItems   = NAV_ITEMS[normalizedRole] ?? NAV_ITEMS.labour_contractor
  const badgeColor = ROLE_BADGES[normalizedRole] ?? roleColor
  const roleLabel = t(`roles.${normalizedRole}` as 'roles.owner')

  return (
    <>
      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center h-14 px-4 sm:px-6 border-b border-border bg-background/95 backdrop-blur gap-3">
        {/* Hamburger — visible on mobile */}
        <button
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile logo */}
        <Link
          href="/"
          aria-label="BuilBid Home"
          className="flex lg:hidden items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity no-underline"
        >
          <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-bold text-foreground">BuilBid</span>
        </Link>

        <div className="flex-1" />

        <LanguageSwitcher className="hidden sm:inline-flex" />
        <ThemeToggle />

        {/* Bell */}
        <button
          onClick={() => { setNotifOpen(true); }}
          className="relative w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button
          onClick={() => setProfileOpen(true)}
          className="rounded-full hover:ring-2 hover:ring-white/20 transition-all flex-shrink-0"
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
        </button>
      </header>

      {/* ── Mobile sidebar drawer ─────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />

          <aside className="relative flex flex-col w-72 h-full bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <Link
                href="/"
                aria-label="BuilBid Home"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity no-underline"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <Building2 className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold text-foreground">BuilBid</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Platform</span>
                </div>
              </Link>
              <button onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
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
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group">
                  <Icon className="w-4 h-4 flex-shrink-0 text-violet-400" />
                  <span className="font-medium">{t(labelKey)}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                </Link>
              ))}

              <div className="pt-3 mt-3 border-t border-border space-y-1">
                <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{t('nav.more')}</p>
                <Link href="/" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Home className="w-4 h-4 text-blue-400" />
                  <span>{t('nav.homePublicFeed')}</span>
                </Link>
                <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>{t('nav.myProfile')}</span>
                </button>
              </div>
            </nav>

            {/* Sign out */}
            <div className="px-3 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setSignOutOpen(true) }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 border border-transparent transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('common.signOut')}</span>
              </button>
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
        onConfirm={signOutAction}
      />
    </>
  )
}

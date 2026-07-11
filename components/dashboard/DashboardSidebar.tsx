'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, LayoutDashboard, Building, Shield, LogOut, Home, ChevronRight, Settings,
} from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { SidebarUserChip } from '@/app/dashboard/SidebarUserChip';
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog';
import { NavLink } from '@/components/shared/NavLink';
import { NavIconButton } from '@/components/shared/NavIconButton';
import type { UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/auth/roles';
import { clientSignOut } from '@/lib/auth/clientSignOut';
import { NAV_LOGO_LINK, NAV_MENU_ITEM } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

type NavRole = UserRole;

const NAV_CONFIG: Record<NavRole, { href: string; icon: typeof LayoutDashboard; labelKey: string }[]> = {
  owner: [
    { href: '/dashboard/owner', icon: LayoutDashboard, labelKey: 'nav.overview' },
    { href: '/dashboard/owner/new-project', icon: Building, labelKey: 'nav.postProject' },
  ],
  labour_contractor: [
    { href: '/dashboard/builder', icon: LayoutDashboard, labelKey: 'nav.overview' },
  ],
  construction_firm: [
    { href: '/dashboard/firm', icon: LayoutDashboard, labelKey: 'nav.overview' },
    { href: '/dashboard/firm/settings', icon: Settings, labelKey: 'nav.firmProfile' },
  ],
  admin: [
    { href: '/dashboard/admin', icon: Shield, labelKey: 'nav.controlCenter' },
    { href: '/dashboard/owner', icon: Building, labelKey: 'nav.projectsAll' },
  ],
};

interface DashboardSidebarProps {
  role: UserRole | string;
  roleColor: 'amber' | 'teal' | 'indigo' | 'violet';
  avatarGradient: string;
}

export function DashboardSidebar({
  role,
  roleColor,
  avatarGradient,
}: DashboardSidebarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const normalizedRole = normalizeRole(role);
  const navItems = NAV_CONFIG[normalizedRole] ?? NAV_CONFIG.labour_contractor;
  const roleLabel = t(`roles.${normalizedRole}` as 'roles.owner');

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card/50">
      <NavLink
        href="/"
        prefetch
        aria-label="BuilBid Home"
        className={cn(NAV_LOGO_LINK, 'px-5 py-5 border-b border-border hover:opacity-90')}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30">
          <Building2 className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-foreground">BuilBid</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {t('common.platform')}
          </span>
        </div>
      </NavLink>

      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <SidebarUserChip
            avatarGradient={avatarGradient}
            roleLabel={roleLabel}
            roleColor={roleColor}
          />
        </div>
        <LanguageSwitcher />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, labelKey }) => (
          <NavLink
            key={href}
            href={href}
            prefetch
            className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent group')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{t(labelKey)}</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
        <div className="pt-3 border-t border-border mt-3">
          <NavLink
            href="/"
            prefetch
            className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent')}
          >
            <Home className="w-4 h-4" />
            <span>{t('nav.homePublicFeed')}</span>
          </NavLink>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <NavIconButton
          type="button"
          onClick={() => setSignOutOpen(true)}
          className={cn(NAV_MENU_ITEM, 'flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-red-400 hover:bg-accent w-full text-left')}
        >
          <LogOut className="w-4 h-4" />
          <span>{t('common.signOut')}</span>
        </NavIconButton>
      </div>

      <SignOutConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={() => clientSignOut(router)}
      />
    </aside>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LogOut, Mail, Phone, MapPin, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { normalizeRole } from '@/lib/auth/roles';

const ROLE_BADGES: Record<string, 'amber' | 'teal' | 'indigo' | 'violet'> = {
  owner: 'amber',
  labour_contractor: 'teal',
  construction_firm: 'violet',
  admin: 'indigo',
};

export interface ProfileDrawerData {
  full_name: string;
  email: string;
  role: string;
  mobile?: string | null;
  physical_address?: string | null;
  pincode?: string | null;
  avatar_url?: string | null;
}

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileDrawerData;
  avatarGradient: string;
  onSignOut: () => void;
}

function getAppRoot(): HTMLElement | null {
  const firstChild = document.body.firstElementChild;
  return firstChild instanceof HTMLElement ? firstChild : null;
}

export function ProfileDrawer({
  open,
  onOpenChange,
  profile,
  avatarGradient,
  onSignOut,
}: ProfileDrawerProps) {
  const { t } = useTranslation();
  const normalizedRole = normalizeRole(profile.role);
  const badgeColor = ROLE_BADGES[normalizedRole] ?? 'teal';
  const roleLabel = t(`roles.${normalizedRole}` as 'roles.owner');

  const drawerRef = useRef<HTMLElement>(null);
  const savedScrollY = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    savedScrollY.current = window.scrollY;
    const appRoot = getAppRoot();

    if (appRoot) {
      appRoot.style.position = 'fixed';
      appRoot.style.top = `-${savedScrollY.current}px`;
      appRoot.style.left = '0';
      appRoot.style.right = '0';
      appRoot.style.width = '100%';
      appRoot.style.overflow = 'hidden';
    }

    document.documentElement.classList.add('profile-drawer-open');
    document.body.classList.add('profile-drawer-open');

    const syncScrollHeight = () => {
      const drawerHeight = drawerRef.current?.offsetHeight ?? 0;
      document.body.style.height = `${Math.max(drawerHeight, window.innerHeight)}px`;
    };

    const syncDrawerPosition = () => {
      if (drawerRef.current) {
        drawerRef.current.style.transform = `translate3d(0, -${window.scrollY}px, 0)`;
      }
    };

    const onScroll = () => {
      syncDrawerPosition();
    };

    const rafId = window.requestAnimationFrame(() => {
      syncScrollHeight();
      window.scrollTo(0, 0);
      syncDrawerPosition();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', syncScrollHeight);

    const drawerEl = drawerRef.current;
    const resizeObserver =
      drawerEl && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(syncScrollHeight)
        : null;
    if (drawerEl && resizeObserver) {
      resizeObserver.observe(drawerEl);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', syncScrollHeight);
      resizeObserver?.disconnect();

      document.documentElement.classList.remove('profile-drawer-open');
      document.body.classList.remove('profile-drawer-open');
      document.body.style.height = '';

      if (appRoot) {
        appRoot.style.position = '';
        appRoot.style.top = '';
        appRoot.style.left = '';
        appRoot.style.right = '';
        appRoot.style.width = '';
        appRoot.style.overflow = '';
      }

      if (drawerRef.current) {
        drawerRef.current.style.transform = '';
      }

      window.scrollTo(0, savedScrollY.current);
    };
  }, [open, profile.mobile, profile.physical_address, profile.full_name]);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className="fixed top-0 right-0 z-50 w-80 bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200 will-change-transform"
        aria-label={t('nav.myProfile')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t('nav.myProfile')}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 py-8 border-b border-border">
          <UserAvatar
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            size="xl"
            gradient={avatarGradient}
            className="shadow-lg"
          />
          <div className="text-center">
            <p className="text-base font-bold text-foreground">{profile.full_name}</p>
            <Badge variant={badgeColor} className="mt-1">{roleLabel}</Badge>
          </div>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Account Details
          </p>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <Mail className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
              <p className="text-sm text-foreground break-all">{profile.email}</p>
            </div>
          </div>

          {profile.mobile && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <Phone className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Mobile</p>
                <p className="text-sm text-foreground">{profile.mobile}</p>
              </div>
            </div>
          )}

          {profile.physical_address && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <MapPin className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Address</p>
                <p className="text-sm text-foreground">
                  {profile.physical_address}
                  {profile.pincode ? ` — ${profile.pincode}` : ''}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <BadgeCheck className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Account Type</p>
              <p className="text-sm text-foreground">{roleLabel}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Upload, X } from 'lucide-react';
import { NavLink } from '@/components/shared/NavLink';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const UPLOAD_PROJECT_HREF = '/dashboard/owner/new-project';
const HIRE_SERVICES_HREF = '/hire-services';
const INTRO_STORAGE_KEY = 'builbid-owner-fab-intro-seen';

type AuthPromptAction = 'upload' | 'hire';

interface OwnerPostProjectFabProps {
  role?: string | null;
  /** False for guest visitors on the homepage. Defaults to true when omitted. */
  isAuthenticated?: boolean;
  /** Pulse when the owner has not posted any projects yet. */
  emphasize?: boolean;
}

export function OwnerPostProjectFab({
  role,
  isAuthenticated = true,
  emphasize = false,
}: OwnerPostProjectFabProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showIntroPulse, setShowIntroPulse] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<AuthPromptAction | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const isOwner = role === 'owner';
  const isGuest = !isAuthenticated;
  const visible = isOwner || isGuest;

  useEffect(() => {
    if (!isOwner) return;
    try {
      if (!localStorage.getItem(INTRO_STORAGE_KEY)) {
        setShowIntroPulse(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, [isOwner]);

  useEffect(() => {
    if (!visible) return;
    router.prefetch(UPLOAD_PROJECT_HREF);
    router.prefetch(HIRE_SERVICES_HREF);
    router.prefetch('/login');
    router.prefetch('/signup');
  }, [visible, router]);

  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [expanded]);

  if (!visible) return null;

  const shouldPulse = isOwner && (emphasize || showIntroPulse);

  function markIntroSeen() {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      /* storage unavailable */
    }
    setShowIntroPulse(false);
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setTooltipVisible(false);
  }

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      setTooltipVisible(true);
    }, 400);
  }

  function toggleExpanded() {
    setExpanded((open) => !open);
    setTooltipVisible(false);
  }

  function handleGuestAction(action: AuthPromptAction) {
    markIntroSeen();
    setExpanded(false);
    setAuthPrompt(action);
  }

  function authNextPath(action: AuthPromptAction): string {
    return action === 'upload' ? UPLOAD_PROJECT_HREF : HIRE_SERVICES_HREF;
  }

  const menuItemClass = cn(
    'flex items-center gap-2.5 rounded-full pl-4 pr-4 py-3',
    'bg-card border border-border text-foreground shadow-lg',
    'text-sm font-semibold whitespace-nowrap',
    'active:scale-[0.98] transition-transform',
  );

  return (
    <>
      <div
        ref={rootRef}
        className="fixed z-50 right-5 flex flex-col items-end gap-2"
        style={{ bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))' }}
      >
        <div
          className={cn(
            'flex flex-col items-stretch gap-2 min-w-[168px] transition-all duration-200 origin-bottom',
            expanded
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none h-0 overflow-hidden',
          )}
          aria-hidden={!expanded}
        >
          {isGuest ? (
            <>
              <button
                type="button"
                onClick={() => handleGuestAction('upload')}
                className={menuItemClass}
              >
                <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                Upload Project
              </button>
              <button
                type="button"
                onClick={() => handleGuestAction('hire')}
                className={menuItemClass}
              >
                <Briefcase className="h-4 w-4 text-violet-600 shrink-0" />
                Hire Services
              </button>
            </>
          ) : (
            <>
              <NavLink
                href={UPLOAD_PROJECT_HREF}
                prefetch
                onClick={() => {
                  markIntroSeen();
                  setExpanded(false);
                }}
                className={menuItemClass}
              >
                <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                Upload Project
              </NavLink>
              <NavLink
                href={HIRE_SERVICES_HREF}
                prefetch
                onClick={() => {
                  markIntroSeen();
                  setExpanded(false);
                }}
                className={menuItemClass}
              >
                <Briefcase className="h-4 w-4 text-violet-600 shrink-0" />
                Hire Services
              </NavLink>
            </>
          )}
        </div>

        <div className="relative flex items-center">
          <span
            className={cn(
              'pointer-events-none absolute right-[calc(100%+12px)] whitespace-nowrap rounded-lg',
              'bg-foreground text-background px-3 py-1.5 text-xs font-semibold shadow-md',
              'transition-opacity duration-200',
              tooltipVisible && !expanded ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!tooltipVisible || expanded}
          >
            {isGuest ? 'Get started' : 'Upload Project'}
          </span>

          <button
            type="button"
            aria-label={expanded ? 'Close menu' : 'Open actions menu'}
            aria-expanded={expanded}
            onClick={toggleExpanded}
            onMouseEnter={() => !expanded && setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={clearLongPress}
            onTouchCancel={clearLongPress}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full',
              'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white',
              'shadow-[0_8px_24px_rgba(22,163,74,0.4)] dark:shadow-[0_8px_24px_rgba(22,163,74,0.3)]',
              'transition-all duration-150 hover:from-emerald-500 hover:to-emerald-400',
              'active:scale-95 active:from-emerald-700 active:to-emerald-600',
              shouldPulse && !expanded && 'animate-pulse ring-2 ring-emerald-400/35 ring-offset-2 ring-offset-background',
            )}
          >
            {expanded ? (
              <X className="h-6 w-6" strokeWidth={2.5} />
            ) : (
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      <Dialog open={authPrompt !== null} onOpenChange={(open) => !open && setAuthPrompt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in to continue</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {authPrompt === 'upload'
              ? 'Create a client account or sign in to upload a project and receive bids from contractors.'
              : 'Sign in or create an account to browse hire services and request callbacks from providers.'}
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button asChild>
              <Link
                href={`/login?next=${encodeURIComponent(authPrompt ? authNextPath(authPrompt) : '/')}`}
              >
                Sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

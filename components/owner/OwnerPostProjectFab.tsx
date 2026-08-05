'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const UPLOAD_PROJECT_HREF = '/dashboard/owner/new-project';
const INTRO_STORAGE_KEY = 'builbid-owner-fab-intro-seen';

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
  const [showIntroPulse, setShowIntroPulse] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

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
    router.prefetch('/login');
    router.prefetch('/signup');
  }, [visible, router]);

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

  function handleClick() {
    if (isGuest) {
      setAuthPromptOpen(true);
      return;
    }
    markIntroSeen();
    router.push(UPLOAD_PROJECT_HREF);
  }

  return (
    <>
      <div
        className="fixed z-50 right-5 flex flex-col items-end gap-2"
        style={{ bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))' }}
      >
        <div className="relative flex items-center">
          <span
            className={cn(
              'pointer-events-none absolute right-[calc(100%+12px)] whitespace-nowrap rounded-lg',
              'bg-foreground text-background px-3 py-1.5 text-xs font-semibold shadow-md',
              'transition-opacity duration-200',
              tooltipVisible ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!tooltipVisible}
          >
            {isGuest ? 'Get started' : 'Upload Project'}
          </span>

          <button
            type="button"
            aria-label="Upload a project"
            onClick={handleClick}
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full',
              'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white',
              'shadow-[0_8px_24px_rgba(22,163,74,0.4)] dark:shadow-[0_8px_24px_rgba(22,163,74,0.3)]',
              'transition-all duration-150 hover:from-emerald-500 hover:to-emerald-400',
              'active:scale-95 active:from-emerald-700 active:to-emerald-600',
              shouldPulse && 'animate-pulse ring-2 ring-emerald-400/35 ring-offset-2 ring-offset-background',
            )}
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in to continue</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a client account or sign in to upload a project and receive bids from contractors
            and trade professionals.
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent(UPLOAD_PROJECT_HREF)}`}>
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

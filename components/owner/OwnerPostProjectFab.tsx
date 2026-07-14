'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAB_HREF = '/dashboard/owner/new-project';
const INTRO_STORAGE_KEY = 'builbid-owner-fab-intro-seen';

interface OwnerPostProjectFabProps {
  role?: string | null;
  /** Pulse when the owner has not posted any projects yet. */
  emphasize?: boolean;
}

export function OwnerPostProjectFab({ role, emphasize = false }: OwnerPostProjectFabProps) {
  const [showIntroPulse, setShowIntroPulse] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = role === 'owner';

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

  if (!isOwner) return null;

  const shouldPulse = emphasize || showIntroPulse;

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

  return (
    <div
      className="fixed z-50 right-5 flex items-center"
      style={{ bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))' }}
    >
      <span
        className={cn(
          'pointer-events-none absolute right-[calc(100%+12px)] whitespace-nowrap rounded-lg',
          'bg-foreground text-background px-3 py-1.5 text-xs font-semibold shadow-md',
          'transition-opacity duration-200',
          tooltipVisible ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden={!tooltipVisible}
      >
        Post New Project
      </span>

      <Link
        href={FAB_HREF}
        aria-label="Post New Project"
        onClick={markIntroSeen}
        onMouseEnter={() => setTooltipVisible(true)}
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
          shouldPulse && 'animate-pulse ring-2 ring-emerald-400/35 ring-offset-2 ring-offset-background',
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

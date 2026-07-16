'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Plus, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const UPLOAD_PROJECT_HREF = '/dashboard/owner/new-project';
const HIRE_SERVICES_HREF = '/hire-services';
const INTRO_STORAGE_KEY = 'builbid-owner-fab-intro-seen';

interface OwnerPostProjectFabProps {
  role?: string | null;
  /** Pulse when the owner has not posted any projects yet. */
  emphasize?: boolean;
}

export function OwnerPostProjectFab({ role, emphasize = false }: OwnerPostProjectFabProps) {
  const [expanded, setExpanded] = useState(false);
  const [showIntroPulse, setShowIntroPulse] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  function toggleExpanded() {
    setExpanded((open) => !open);
    setTooltipVisible(false);
  }

  return (
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
        <Link
          href={UPLOAD_PROJECT_HREF}
          onClick={() => {
            markIntroSeen();
            setExpanded(false);
          }}
          className={cn(
            'flex items-center gap-2.5 rounded-full pl-4 pr-4 py-3',
            'bg-card border border-border text-foreground shadow-lg',
            'text-sm font-semibold whitespace-nowrap',
            'active:scale-[0.98] transition-transform',
          )}
        >
          <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
          Upload Project
        </Link>
        <Link
          href={HIRE_SERVICES_HREF}
          onClick={() => {
            markIntroSeen();
            setExpanded(false);
          }}
          className={cn(
            'flex items-center gap-2.5 rounded-full pl-4 pr-4 py-3',
            'bg-card border border-border text-foreground shadow-lg',
            'text-sm font-semibold whitespace-nowrap',
            'active:scale-[0.98] transition-transform',
          )}
        >
          <Briefcase className="h-4 w-4 text-violet-600 shrink-0" />
          Hire Services
        </Link>
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
          Upload Project
        </span>

        <button
          type="button"
          aria-label={expanded ? 'Close menu' : 'Upload Project menu'}
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
  );
}

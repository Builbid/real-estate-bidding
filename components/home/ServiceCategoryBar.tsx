'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getVisibleServiceCategories } from '@/lib/trades';
import { cn } from '@/lib/utils';
import type { ServiceType } from '@/lib/types';

interface ServiceCategoryBarProps {
  isAuthenticated: boolean;
  role: string | null;
}

const TILE_TONES = [
  'from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/25 group-hover:border-amber-500/50',
  'from-sky-500/15 via-blue-500/5 to-transparent border-sky-500/25 group-hover:border-sky-500/50',
  'from-rose-500/15 via-pink-500/5 to-transparent border-rose-500/25 group-hover:border-rose-500/50',
  'from-slate-500/15 via-zinc-500/5 to-transparent border-slate-400/30 group-hover:border-slate-400/55',
  'from-yellow-400/20 via-amber-400/5 to-transparent border-yellow-500/30 group-hover:border-yellow-500/55',
  'from-teal-500/15 via-emerald-500/5 to-transparent border-teal-500/25 group-hover:border-teal-500/50',
  'from-indigo-500/15 via-violet-500/5 to-transparent border-indigo-500/25 group-hover:border-indigo-500/50',
  'from-lime-500/15 via-green-500/5 to-transparent border-lime-500/30 group-hover:border-lime-500/55',
] as const;

/** Custom water tap with flowing drops — sized to sit with the emoji service icons. */
function WaterTapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 text-sky-600 dark:text-sky-400"
      aria-hidden
    >
      {/* Tap Handle */}
      <path d="M10 2h4" />
      <path d="M12 2v3" />
      {/* Main Pipe/Faucet Body */}
      <path d="M4 8h10a3 3 0 0 1 3 3v3H7a3 3 0 0 1-3-3V8z" />
      {/* Spout Outlet */}
      <path d="M14 14v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2" />
      {/* Water Drops */}
      <circle cx="11.5" cy="19.5" r="0.8" fill="currentColor" />
      <circle cx="11.5" cy="22" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Compact homepage service picker — sized to fit the first viewport with the hero. */
export function ServiceCategoryBar({ isAuthenticated, role }: ServiceCategoryBarProps) {
  const router = useRouter();
  const [authPromptHref, setAuthPromptHref] = useState<string | null>(null);
  const isOwner = role === 'owner';
  const categories = getVisibleServiceCategories();

  function handleSelect(service: ServiceType) {
    const target = `/dashboard/owner/new-project?service=${service}`;
    if (!isAuthenticated || !isOwner) {
      setAuthPromptHref(target);
      return;
    }
    router.push(target);
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-emerald-500/[0.07] px-3 py-4 shadow-sm backdrop-blur-sm sm:px-5 sm:py-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />

        <div className="relative">
          <p className="mx-auto max-w-2xl text-center text-xs font-medium leading-snug text-slate-700 dark:text-slate-200 sm:text-sm">
            Post your project and receive competitive ₹/sqft bids from verified professionals.
          </p>

          <div
            className={cn(
              'mt-4 mx-auto grid w-full max-w-6xl auto-rows-fr items-stretch justify-items-center gap-2 sm:mt-5 lg:gap-2',
              categories.length >= 8
                ? 'grid-cols-4 md:grid-cols-8 md:gap-1'
                : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7 md:gap-1',
            )}
          >
            {categories.map((cat, index) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleSelect(cat.value)}
                className="group flex h-full w-full min-w-0 flex-col items-center gap-1 text-center"
              >
                <span
                  className={cn(
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br shadow-sm transition-all duration-200 sm:h-11 sm:w-11',
                    'group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.97]',
                    TILE_TONES[index % TILE_TONES.length],
                  )}
                >
                  <span className="absolute inset-0 rounded-lg bg-card/40 dark:bg-card/20" />
                  <span className="relative flex items-center justify-center leading-none drop-shadow-sm transition-transform duration-200 group-hover:scale-110">
                    {cat.value === 'plumber' ? (
                      <WaterTapIcon />
                    ) : (
                      <span className="text-lg sm:text-xl">{cat.emoji}</span>
                    )}
                  </span>
                </span>
                <span className="line-clamp-2 min-h-[2em] px-0.5 text-[9px] font-semibold leading-tight text-slate-800 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400 sm:text-[10px]">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!authPromptHref} onOpenChange={(open) => { if (!open) setAuthPromptHref(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in to post a project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Create a client account or sign in to post this project and start receiving bids from
            registered contractors and trade professionals.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent(authPromptHref ?? '/dashboard/owner/new-project')}`}>
                Sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup/client">Create client account</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ALL_SERVICE_CATEGORIES } from '@/lib/trades';
import { cn } from '@/lib/utils';
import type { ServiceType } from '@/lib/types';

interface ServiceCategoryBarProps {
  isAuthenticated: boolean;
  role: string | null;
}

const TILE_TONES = [
  'from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/25 group-hover:border-amber-500/50 group-hover:shadow-amber-500/10',
  'from-sky-500/15 via-blue-500/5 to-transparent border-sky-500/25 group-hover:border-sky-500/50 group-hover:shadow-sky-500/10',
  'from-rose-500/15 via-pink-500/5 to-transparent border-rose-500/25 group-hover:border-rose-500/50 group-hover:shadow-rose-500/10',
  'from-slate-500/15 via-zinc-500/5 to-transparent border-slate-400/30 group-hover:border-slate-400/55 group-hover:shadow-slate-500/10',
  'from-yellow-400/20 via-amber-400/5 to-transparent border-yellow-500/30 group-hover:border-yellow-500/55 group-hover:shadow-yellow-500/10',
  'from-teal-500/15 via-emerald-500/5 to-transparent border-teal-500/25 group-hover:border-teal-500/50 group-hover:shadow-teal-500/10',
  'from-indigo-500/15 via-violet-500/5 to-transparent border-indigo-500/25 group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10',
  'from-lime-500/15 via-green-500/5 to-transparent border-lime-500/30 group-hover:border-lime-500/55 group-hover:shadow-lime-500/10',
] as const;

/** Homepage service picker — every postable bidding category. */
export function ServiceCategoryBar({ isAuthenticated, role }: ServiceCategoryBarProps) {
  const router = useRouter();
  const [authPromptHref, setAuthPromptHref] = useState<string | null>(null);
  const isOwner = role === 'owner';

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
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/[0.06] px-3 py-3.5 sm:px-5 sm:py-4 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-amber-500/8 blur-3xl" />

        <div className="relative">
          <p className="text-center text-xs sm:text-sm text-muted-foreground leading-snug max-w-2xl mx-auto">
            Post your project and receive competitive ₹/sqft bids from verified professionals.
          </p>
          <h2 className="mt-1 text-center text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Hire Services
          </h2>
          <div className="mx-auto mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />

          <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8 sm:gap-3">
            {ALL_SERVICE_CATEGORIES.map((cat, index) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleSelect(cat.value)}
                className="group flex flex-col items-center gap-1 text-center"
              >
                <span
                  className={cn(
                    'relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border bg-gradient-to-br shadow-sm transition-all duration-200',
                    'group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.97]',
                    TILE_TONES[index % TILE_TONES.length],
                  )}
                >
                  <span className="absolute inset-0 rounded-xl bg-card/40 dark:bg-card/20" />
                  <span className="relative text-xl sm:text-2xl leading-none drop-shadow-sm transition-transform duration-200 group-hover:scale-110">
                    {cat.emoji}
                  </span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold leading-tight text-foreground/90 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 px-0.5">
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
          <p className="text-sm text-muted-foreground">
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

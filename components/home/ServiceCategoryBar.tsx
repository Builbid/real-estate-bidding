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
  'from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/25 group-hover:border-amber-500/50',
  'from-sky-500/15 via-blue-500/5 to-transparent border-sky-500/25 group-hover:border-sky-500/50',
  'from-rose-500/15 via-pink-500/5 to-transparent border-rose-500/25 group-hover:border-rose-500/50',
  'from-slate-500/15 via-zinc-500/5 to-transparent border-slate-400/30 group-hover:border-slate-400/55',
  'from-yellow-400/20 via-amber-400/5 to-transparent border-yellow-500/30 group-hover:border-yellow-500/55',
  'from-teal-500/15 via-emerald-500/5 to-transparent border-teal-500/25 group-hover:border-teal-500/50',
  'from-indigo-500/15 via-violet-500/5 to-transparent border-indigo-500/25 group-hover:border-indigo-500/50',
  'from-lime-500/15 via-green-500/5 to-transparent border-lime-500/30 group-hover:border-lime-500/55',
] as const;

/** Compact homepage service picker — sized to fit the first viewport with the hero. */
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
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-emerald-500/[0.07] px-2.5 py-2.5 sm:px-4 sm:py-3 shadow-sm backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />

        <div className="relative">
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-center text-[11px] sm:text-xs text-muted-foreground leading-tight">
              Post your project and receive competitive ₹/sqft bids from verified professionals.
            </p>
            <h2 className="text-center text-sm sm:text-base font-bold tracking-tight text-foreground">
              Hire Services
            </h2>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2">
            {ALL_SERVICE_CATEGORIES.map((cat, index) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleSelect(cat.value)}
                className="group flex flex-col items-center gap-0.5 text-center"
              >
                <span
                  className={cn(
                    'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border bg-gradient-to-br shadow-sm transition-all duration-200',
                    'group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.97]',
                    TILE_TONES[index % TILE_TONES.length],
                  )}
                >
                  <span className="absolute inset-0 rounded-lg bg-card/40 dark:bg-card/20" />
                  <span className="relative text-lg sm:text-xl leading-none drop-shadow-sm transition-transform duration-200 group-hover:scale-110">
                    {cat.emoji}
                  </span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold leading-tight text-foreground/90 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 px-0.5">
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

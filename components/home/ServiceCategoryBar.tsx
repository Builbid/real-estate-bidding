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

/** Flipkart-style category row — every service a client can post a project for,
 * mirroring the options inside the "+ Upload Project" button. */
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
      <div className="flex gap-4 overflow-x-auto scrollbar-hide sm:flex-wrap sm:justify-center sm:overflow-visible sm:gap-x-6 sm:gap-y-3">
        {ALL_SERVICE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleSelect(cat.value)}
            className="group flex w-[74px] flex-shrink-0 flex-col items-center gap-1.5 sm:w-20"
          >
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card text-2xl shadow-sm transition-all sm:h-16 sm:w-16 sm:text-3xl',
                'group-hover:-translate-y-0.5 group-hover:border-emerald-500/40 group-hover:shadow-md',
              )}
            >
              {cat.emoji}
            </span>
            <span className="text-center text-[11px] font-medium leading-tight text-foreground/90 line-clamp-2 sm:text-xs">
              {cat.label}
            </span>
          </button>
        ))}
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

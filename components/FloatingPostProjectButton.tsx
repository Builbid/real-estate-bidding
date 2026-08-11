'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function shouldHideFloatingPostButton(pathname: string | null): boolean {
  if (!pathname) return true;
  const path = pathname.replace(/\/$/, '') || '/';

  // Client dashboard already has a static Post New Project button.
  if (path === '/dashboard/owner') return true;

  // Hide while already on the new-project flow.
  if (
    path === '/dashboard/owner/new-project' ||
    path.startsWith('/dashboard/owner/new-project/')
  ) {
    return true;
  }

  return false;
}

export function FloatingPostProjectButton() {
  const pathname = usePathname();

  if (shouldHideFloatingPostButton(pathname)) return null;

  return (
    <Link
      href="/dashboard/owner/new-project"
      aria-label="Post New Project"
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'inline-flex items-center gap-2 rounded-full',
        'bg-emerald-600/80 text-white font-medium backdrop-blur-md',
        'border border-white/20',
        'px-5 py-3 text-sm',
        'shadow-lg shadow-emerald-900/25',
        'hover:bg-emerald-600/95 hover:shadow-lg hover:shadow-emerald-900/30',
        'transition-all duration-200 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <Plus className="h-4 w-4 shrink-0" aria-hidden />
      Post New Project
    </Link>
  );
}

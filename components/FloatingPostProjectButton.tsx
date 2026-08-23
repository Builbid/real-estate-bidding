'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { normalizeRole } from '@/lib/auth/roles';
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
  const { profile, loading } = useProfile();

  if (loading) return null;

  const role = profile ? normalizeRole(profile.role) : null;
  if (role !== 'owner') return null;

  if (shouldHideFloatingPostButton(pathname)) return null;

  return (
    <Link
      href="/dashboard/owner/new-project"
      title="Post New Project"
      aria-label="Post New Project"
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex h-14 w-14 items-center justify-center rounded-full',
        'bg-emerald-500/15 text-emerald-400 backdrop-blur-md',
        'border border-emerald-500/30',
        'shadow-lg shadow-emerald-900/10',
        'hover:bg-emerald-500/25 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-900/20',
        'dark:bg-emerald-400/20 dark:text-emerald-300 dark:border-white/20',
        'dark:hover:bg-emerald-400/30',
        'transition-all duration-200 active:scale-[0.96]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <Plus className="h-7 w-7 shrink-0 stroke-[2.5]" aria-hidden />
    </Link>
  );
}

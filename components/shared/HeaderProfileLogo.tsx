'use client';

import { User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/shared/NavLink';
import { cn } from '@/lib/utils';

/** Myntra-style header Profile control: outline person icon with a label underneath. */
export function HeaderProfileLogo({
  href = '/dashboard/profile',
  overlay = false,
  className,
}: {
  href?: string;
  overlay?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  if (pathname === '/dashboard/profile' || pathname.startsWith('/dashboard/profile/')) {
    return null;
  }

  return (
    <NavLink
      href={href}
      prefetch
      className={cn(
        'inline-flex flex-col items-center justify-center gap-[3px] self-center px-2 no-underline',
        overlay
          ? 'text-slate-900 hover:text-[#ee5f73] dark:text-slate-100 dark:hover:text-sky-400'
          : 'text-foreground hover:text-sky-600 dark:hover:text-sky-400',
        className,
      )}
    >
      <User className="h-5 w-5" strokeWidth={1.6} />
      <span className="text-[12px] font-bold leading-none tracking-tight">Profile</span>
    </NavLink>
  );
}

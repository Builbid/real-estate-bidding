'use client';

import { User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/shared/NavLink';
import { cn } from '@/lib/utils';

/** Header Profile control: outline person icon with a label underneath. */
export function HeaderProfileLogo({
  href = '/dashboard/profile',
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
        'inline-flex cursor-pointer flex-col items-center justify-center gap-[3px] self-center px-2 no-underline',
        'text-gray-700 dark:text-slate-200',
        'transition-transform duration-200 hover:scale-105 hover:text-gray-900 dark:hover:text-slate-100',
        className,
      )}
    >
      <User className="h-5 w-5" strokeWidth={1.6} />
      <span className="text-[12px] font-bold leading-none tracking-tight">Profile</span>
    </NavLink>
  );
}

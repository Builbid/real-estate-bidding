'use client';

import { User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/shared/NavLink';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { useHeaderIdentity } from '@/lib/hooks/useHeaderIdentity';

/**
 * Header Profile control.
 * - Logged out: outline person icon with the "Profile" label underneath.
 * - Logged in: person icon beside the user's name, with a small plain-text
 *   account type ("Owner" / "Worker") directly below the name.
 */
export function HeaderProfileLogo({
  href = '/dashboard/profile',
  className,
}: {
  href?: string;
  overlay?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const identity = useHeaderIdentity();

  if (pathname === '/dashboard/profile' || pathname.startsWith('/dashboard/profile/')) {
    return null;
  }

  const baseClass = cn(
    'cursor-pointer self-center no-underline',
    'text-gray-700 dark:text-slate-200',
    'transition-transform duration-200 hover:scale-105 hover:text-gray-900 dark:hover:text-slate-100',
  );

  if (!identity) {
    return (
      <NavLink
        href={href}
        prefetch
        className={cn(
          baseClass,
          'inline-flex flex-col items-center justify-center gap-[3px] px-4',
          className,
        )}
      >
        <User className="h-5 w-5" strokeWidth={1.6} />
        <span className="text-[12px] font-bold leading-none tracking-tight">Profile</span>
      </NavLink>
    );
  }

  const roleLabel = identity.role ? t(`roles.${identity.role}` as 'roles.owner') : '';

  return (
    <NavLink
      href={href}
      prefetch
      aria-label={roleLabel ? `${identity.name}, ${roleLabel}` : identity.name}
      className={cn(baseClass, 'inline-flex items-center gap-2 px-3', className)}
    >
      <User className="h-5 w-5 shrink-0" strokeWidth={1.6} />
      <span className="flex min-w-0 flex-col items-start">
        <span className="max-w-[9rem] truncate text-[13px] font-bold leading-tight tracking-tight">
          {identity.name}
        </span>
        {roleLabel && (
          <span className="text-[10px] font-medium leading-tight text-gray-500 dark:text-slate-400">
            {roleLabel}
          </span>
        )}
      </span>
    </NavLink>
  );
}

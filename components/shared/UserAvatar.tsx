'use client';

import { AVATAR_BLOCK_CLASS } from '@/lib/avatar/theme';
import { ownerInitials } from '@/lib/builderRatings';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  header: { className: 'h-9 w-9 text-sm rounded-xl' },
  xs: { className: 'h-8 w-8 text-xs rounded-lg' },
  sm: { className: 'h-10 w-10 text-sm rounded-xl' },
  md: { className: 'h-11 w-11 text-sm rounded-xl' },
  lg: { className: 'h-12 w-12 text-base rounded-xl' },
  xl: { className: 'h-20 w-20 text-3xl rounded-2xl' },
  registration: { className: 'h-24 w-24 text-3xl rounded-2xl' },
} as const;

export type UserAvatarSize = keyof typeof SIZE_MAP;

interface UserAvatarProps {
  name: string;
  /** @deprecated Profile photos are disabled — avatars always show the user's initial. */
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  /** @deprecated Initials use a universal sky logo-block theme for every account type. */
  gradient?: string;
  className?: string;
  /** @deprecated Profile photos are disabled — avatars always show the user's initial. */
  showPhoto?: boolean;
}

export function UserAvatar({
  name,
  size = 'md',
  className,
}: UserAvatarProps) {
  const { className: sizeClass } = SIZE_MAP[size];
  const initial = ownerInitials(name);

  return (
    <div
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-bold leading-none tracking-tight',
        AVATAR_BLOCK_CLASS,
        sizeClass,
        className,
      )}
    >
      {initial}
    </div>
  );
}

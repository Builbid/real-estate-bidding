'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ownerInitials } from '@/lib/builderRatings';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  header: { className: 'h-9 w-9 text-sm' },
  xs: { className: 'h-8 w-8 text-xs' },
  sm: { className: 'h-10 w-10 text-sm' },
  md: { className: 'h-11 w-11 text-sm' },
  lg: { className: 'h-12 w-12 text-base' },
  xl: { className: 'h-20 w-20 text-2xl' },
  registration: { className: 'h-24 w-24 text-xl' },
} as const;

export type UserAvatarSize = keyof typeof SIZE_MAP;

interface UserAvatarProps {
  name: string;
  /** @deprecated Profile photos are disabled — avatars always show the user's initial. */
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  gradient?: string;
  className?: string;
  /** @deprecated Profile photos are disabled — avatars always show the user's initial. */
  showPhoto?: boolean;
}

export function UserAvatar({
  name,
  size = 'md',
  gradient = 'from-emerald-500 to-teal-600',
  className,
}: UserAvatarProps) {
  const { className: sizeClass } = SIZE_MAP[size];
  const initials = ownerInitials(name);

  return (
    <Avatar className={cn(sizeClass, 'ring-2 ring-border/80', className)}>
      <AvatarFallback className={cn('bg-gradient-to-br font-bold text-white', gradient)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

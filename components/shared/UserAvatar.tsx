'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ownerInitials } from '@/lib/builderRatings';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  header: { px: 36, className: 'h-9 w-9 text-sm' },
  xs: { px: 32, className: 'h-8 w-8 text-xs' },
  sm: { px: 40, className: 'h-10 w-10 text-sm' },
  md: { px: 44, className: 'h-11 w-11 text-sm' },
  lg: { px: 48, className: 'h-12 w-12 text-base' },
  xl: { px: 80, className: 'h-20 w-20 text-2xl' },
  registration: { px: 96, className: 'h-24 w-24 text-xl' },
} as const;

export type UserAvatarSize = keyof typeof SIZE_MAP;

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  gradient?: string;
  className?: string;
  /** When false, always show initials instead of the photo URL. */
  showPhoto?: boolean;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  gradient = 'from-emerald-500 to-teal-600',
  className,
  showPhoto = true,
}: UserAvatarProps) {
  const { px, className: sizeClass } = SIZE_MAP[size];
  const initials = ownerInitials(name);
  const [imgError, setImgError] = useState(false);
  const canShowPhoto = showPhoto && !!avatarUrl && !imgError;

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  return (
    <Avatar className={cn(sizeClass, 'ring-2 ring-border/80', className)}>
      {canShowPhoto ? (
        <Image
          src={avatarUrl}
          alt={`${name} profile photo`}
          width={px}
          height={px}
          className="aspect-square h-full w-full object-cover"
          unoptimized={avatarUrl.includes('supabase.co')}
          onError={() => setImgError(true)}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br font-bold text-white',
          gradient,
          canShowPhoto && 'opacity-0'
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

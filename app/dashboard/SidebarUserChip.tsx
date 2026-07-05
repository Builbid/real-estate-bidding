'use client';

import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useDashboardProfile } from '@/lib/context/ProfileProvider';

interface SidebarUserChipProps {
  avatarGradient: string;
  roleLabel: string;
  roleColor: 'amber' | 'teal' | 'indigo' | 'violet';
}

export function SidebarUserChip({ avatarGradient, roleLabel, roleColor }: SidebarUserChipProps) {
  const { profile } = useDashboardProfile();

  if (!profile) return null;

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/60">
      <UserAvatar
        name={profile.full_name}
        avatarUrl={profile.avatar_url}
        size="xs"
        gradient={avatarGradient}
        className="flex-shrink-0"
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{profile.full_name}</p>
        <Badge variant={roleColor} className="text-[9px] py-0 self-start">{roleLabel}</Badge>
      </div>
    </div>
  );
}

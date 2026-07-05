'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarUpload } from '@/components/builder/AvatarUpload';
import { User } from 'lucide-react';

interface BuilderProfileSettingsProps {
  fullName: string;
  avatarUrl?: string | null;
}

export function BuilderProfileSettings({ fullName, avatarUrl }: BuilderProfileSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          Profile Photo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AvatarUpload fullName={fullName} avatarUrl={avatarUrl} />
      </CardContent>
    </Card>
  );
}

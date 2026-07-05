'use client';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/lib/context/LanguageProvider';
import { ProfileProvider } from '@/lib/context/ProfileProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

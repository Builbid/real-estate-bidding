'use client';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/lib/context/LanguageProvider';
import { PostProjectGuardProvider } from '@/components/auth/PostProjectGuardProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <PostProjectGuardProvider>{children}</PostProjectGuardProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

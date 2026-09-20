'use client';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/lib/context/LanguageProvider';
import { PostProjectGuardProvider } from '@/components/auth/PostProjectGuardProvider';
import { ScrollToTopOnRouteChange } from '@/components/providers/ScrollToTopOnRouteChange';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ScrollToTopOnRouteChange />
        <PostProjectGuardProvider>{children}</PostProjectGuardProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

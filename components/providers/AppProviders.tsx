'use client';

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/lib/context/LanguageProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}

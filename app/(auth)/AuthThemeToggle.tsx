'use client';

import { ThemeToggle } from '@/components/shared/ThemeToggle';

export function AuthThemeToggle() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );
}

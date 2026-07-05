'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  /** Compact icon-only button for dense headers */
  iconOnly?: boolean;
}

export function ThemeToggle({ className, iconOnly = true }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(iconOnly ? 'w-9 h-9' : 'h-9 w-[4.5rem]', className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        iconOnly
          ? 'w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
          : 'inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!iconOnly && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}

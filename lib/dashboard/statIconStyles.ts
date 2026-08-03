/** Explicit Tailwind classes for dashboard stat icons (dynamic `bg-${color}` does not compile). */
export const STAT_ICON_STYLES = {
  emerald: {
    box: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  indigo: {
    box: 'bg-indigo-500/10 border-indigo-500/20',
    icon: 'text-indigo-500 dark:text-indigo-400',
  },
  teal: {
    box: 'bg-teal-500/10 border-teal-500/20',
    icon: 'text-teal-500 dark:text-teal-400',
  },
  violet: {
    box: 'bg-violet-500/10 border-violet-500/20',
    icon: 'text-violet-500 dark:text-violet-400',
  },
  amber: {
    box: 'bg-amber-500/10 border-amber-500/20',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  slate: {
    box: 'bg-muted/60 border-border/80',
    icon: 'text-muted-foreground',
  },
} as const;

export type StatIconColor = keyof typeof STAT_ICON_STYLES;

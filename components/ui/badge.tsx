import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-secondary text-secondary-foreground border-border',
        emerald:   'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
        indigo:    'bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-400',
        red:       'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
        amber:     'bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-400',
        teal:      'bg-teal-500/15 text-teal-800 border-teal-500/30 dark:text-teal-400',
        violet:    'bg-violet-500/15 text-violet-800 border-violet-500/30 dark:text-violet-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

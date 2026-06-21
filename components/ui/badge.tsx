import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-slate-800 text-slate-300 border-slate-700',
        emerald:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        indigo:    'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        red:       'bg-red-500/15 text-red-400 border-red-500/30',
        amber:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
        teal:      'bg-teal-500/15 text-teal-400 border-teal-500/30',
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

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 btn-glow-emerald active:scale-[0.98]',
        destructive:
          'bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/20 active:scale-[0.98]',
        outline:
          'border border-border/80 bg-card/50 text-foreground shadow-sm hover:bg-accent/80 hover:border-emerald-500/30 hover:text-foreground backdrop-blur-sm active:opacity-70 active:scale-[0.98] active:bg-accent',
        secondary:
          'bg-secondary/80 text-secondary-foreground border border-border/50 shadow-sm hover:bg-secondary active:opacity-70 active:scale-[0.98]',
        ghost:
          'text-muted-foreground hover:text-foreground hover:bg-accent/70 active:opacity-70 active:scale-[0.97] active:bg-accent/90',
        link:
          'text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline p-0 h-auto',
        indigo:
          'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-12 px-8 text-base',
        xl:      'h-14 px-10 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

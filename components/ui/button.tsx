import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-[0.98]',
        destructive:
          'bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/20',
        outline:
          'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white',
        secondary:
          'bg-slate-800 text-slate-200 hover:bg-slate-700',
        ghost:
          'text-slate-400 hover:text-white hover:bg-slate-800',
        link:
          'text-emerald-400 underline-offset-4 hover:underline p-0 h-auto',
        indigo:
          'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20',
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

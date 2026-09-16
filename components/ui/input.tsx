import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, prefix, suffix, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-muted-foreground text-sm dark:text-zinc-400">{prefix}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base md:text-sm text-foreground placeholder:text-slate-600 shadow-sm appearance-none',
              'dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400 dark:shadow-none dark:[color-scheme:dark]',
              'ring-offset-background transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand',
              'disabled:cursor-not-allowed disabled:opacity-50',
              '[&::-webkit-search-decoration]:appearance-none [&::-webkit-search-cancel-button]:appearance-none',
              prefix && 'pl-8',
              suffix && 'pr-8',
              error && 'border-red-500/70 focus:ring-red-500/40',
              className
            )}
            ref={ref}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 text-muted-foreground text-sm">{suffix}</div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FieldError, INVALID_CONTROL_CLASS } from '@/components/owner/wizard/fieldValidation';
import {
  WIZARD_SECTION_LABEL_BASE,
  useWizardAccentLabel,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** Force wizard accent labels on/off. Defaults to the surrounding wizard context. */
  accentLabel?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, prefix, suffix, accentLabel, ...props }, ref) => {
    const useAccent = useWizardAccentLabel(accentLabel);
    return (
      <div
        className="flex w-full flex-col gap-1.5"
        data-field-invalid={error ? 'true' : undefined}
      >
        {label && (
          <label
            className={
              useAccent
                ? WIZARD_SECTION_LABEL_BASE
                : 'text-xs font-semibold text-slate-800 dark:text-zinc-100 uppercase tracking-wider'
            }
          >
            {useAccent ? withSectionColon(label) : label}
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
              error && INVALID_CONTROL_CLASS,
              className
            )}
            ref={ref}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 text-muted-foreground text-sm">{suffix}</div>
          )}
        </div>
        <FieldError message={error} />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };

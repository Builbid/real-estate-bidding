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
  /** Extra classes for the field label. */
  labelClassName?: string;
  /** Tight label-to-input spacing without the wizard bullet. */
  compact?: boolean;
  /** Force wizard accent labels on/off. Defaults to the surrounding wizard context. */
  accentLabel?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, prefix, suffix, labelClassName, compact, accentLabel, ...props }, ref) => {
    const useAccent = useWizardAccentLabel(accentLabel);
    return (
      <div
        className={cn('flex w-full flex-col', compact ? 'gap-1' : 'gap-1.5')}
        data-field-invalid={error ? 'true' : undefined}
      >
        {label && (
          <label
            className={cn(
              compact
                ? 'flex items-end text-sm font-medium leading-5 text-slate-800 dark:text-zinc-100 md:min-h-10'
                : useAccent
                  ? WIZARD_SECTION_LABEL_BASE
                  : 'text-xs font-semibold text-slate-800 dark:text-zinc-100 uppercase tracking-wider',
              labelClassName,
            )}
          >
            {compact || useAccent ? withSectionColon(label) : label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-muted-foreground text-sm dark:text-zinc-400">{prefix}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm appearance-none placeholder:text-slate-500 md:text-sm',
              'dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]',
              'ring-offset-background transition-all duration-150',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'dark:focus:border-sky-400 dark:focus:ring-sky-400/20',
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
        {compact ? (error ? <FieldError message={error} /> : null) : <FieldError message={error} />}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };

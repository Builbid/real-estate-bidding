'use client';

import { useId } from 'react';
import {
  FLOOR_COPY_LABEL,
  FLOOR_COPY_MANUAL_LABEL,
  FLOOR_COPY_MANUAL_VALUE,
  FLOOR_COPY_PLACEHOLDER_LABEL,
  FLOOR_COPY_PLACEHOLDER_VALUE,
  floorCopyOptionLabel,
  type FloorCopyOption,
} from '@/lib/floorCopy';
import { cn } from '@/lib/utils';

/**
 * "Copy requirements from: [Select Floor]" dropdown rendered at the top-right of
 * every floor section after the first selected floor. Lists all previous floors
 * plus a "Deselect / Clear / Manual" entry that resets the auto-filled values.
 */
export function FloorCopyFromSelect({
  options,
  value,
  onChange,
  variant = 'plain',
  className,
}: {
  /** Previous floors available as a copy source. Renders nothing when empty. */
  options: readonly FloorCopyOption[];
  /** Selected source floor, '' for manual entry, or null when nothing was chosen yet. */
  value: string | null;
  onChange: (source: string) => void;
  /** `onBlue` is for use inside the solid blue floor header bar. */
  variant?: 'plain' | 'onBlue';
  className?: string;
}) {
  const id = useId();
  if (options.length === 0) return null;
  const onBlue = variant === 'onBlue';

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <label
        htmlFor={id}
        className={cn(
          'shrink-0 text-[11px] font-bold tracking-wide',
          onBlue ? 'text-white/90' : 'text-slate-700 dark:text-slate-300',
        )}
      >
        {FLOOR_COPY_LABEL}
      </label>
      <select
        id={id}
        value={value ?? FLOOR_COPY_PLACEHOLDER_VALUE}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 min-w-0 max-w-[14rem] cursor-pointer rounded-lg border px-2 text-xs font-semibold shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2',
          onBlue
            ? 'border-white/40 bg-white text-slate-900 focus-visible:ring-white/60'
            : 'border-slate-300 bg-white text-slate-900 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        )}
      >
        <option value={FLOOR_COPY_PLACEHOLDER_VALUE} disabled hidden>
          {FLOOR_COPY_PLACEHOLDER_LABEL}
        </option>
        <option value={FLOOR_COPY_MANUAL_VALUE}>{FLOOR_COPY_MANUAL_LABEL}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {floorCopyOptionLabel(option.label, options.length)}
          </option>
        ))}
      </select>
    </div>
  );
}

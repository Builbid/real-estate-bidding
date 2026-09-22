'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatIndianDateInput,
  isoToIndianDate,
  parseIndianDateToIso,
  PROJECT_START_DATE_FORMAT_INVALID_MESSAGE,
} from '@/lib/projectStartTime';

export function IndianContractDateField({
  label,
  value,
  onChange,
  minIso,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minIso?: string;
  error?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(() => isoToIndianDate(value));

  useEffect(() => {
    if (!value) return;
    const indian = isoToIndianDate(value);
    setDisplay((current) => (parseIndianDateToIso(current) === value ? current : indian));
  }, [value]);

  const complete = display.length === 10;
  const parsedIso = complete ? parseIndianDateToIso(display) : null;
  const formatError =
    complete && !parsedIso ? PROJECT_START_DATE_FORMAT_INVALID_MESSAGE : undefined;
  const rangeError =
    parsedIso && minIso && parsedIso < minIso
      ? 'This date cannot be earlier than the start date.'
      : undefined;
  const shownError = error ?? formatError ?? rangeError;

  function handleDisplayChange(raw: string) {
    const next = formatIndianDateInput(raw, display);
    setDisplay(next);
    if (!next) {
      onChange('');
      return;
    }
    const iso = parseIndianDateToIso(next);
    onChange(iso ?? '');
  }

  function openCalendar() {
    const el = pickerRef.current;
    if (!el) return;
    try {
      const picker = el as HTMLInputElement & { showPicker?: () => void };
      picker.showPicker?.();
    } catch {
      el.focus();
    }
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-100">
        {label}
      </label>
      <div
        className={cn(
          'flex w-full overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-zinc-900',
          shownError
            ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/40'
            : 'border-gray-200 focus-within:ring-2 focus-within:ring-emerald-500/40 dark:border-zinc-800',
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          autoComplete="off"
          value={display}
          onChange={(e) => handleDisplayChange(e.target.value)}
          aria-invalid={Boolean(shownError)}
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-none focus:outline-none focus:ring-0 dark:text-white"
        />
        <div className="relative h-11 w-11 shrink-0">
          <input
            ref={pickerRef}
            type="date"
            value={value}
            min={minIso || undefined}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden
          />
          <button
            type="button"
            onClick={openCalendar}
            className="flex h-11 w-11 items-center justify-center text-slate-500 hover:text-emerald-700"
            aria-label="Open calendar"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>
      {shownError ? <p className="text-xs text-red-600 dark:text-red-400">{shownError}</p> : null}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { FORM_NOTE_BOX, FORM_SECTION_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';
import {
  clampProjectStartDateInput,
  formatIndianDateInput,
  getProjectStartBookingNote,
  getProjectStartDateFieldError,
  isoToIndianDate,
  maxProjectStartDateString,
  parseIndianDateToIso,
  PROJECT_START_DATE_FORMAT_INVALID_MESSAGE,
  PROJECT_START_TIME_OPTIONS,
  todayLocalDateString,
  type ProjectStartTimeType,
} from '@/lib/projectStartTime';
import {
  WIZARD_SECTION_LABEL,
  WIZARD_SECTION_LABEL_BASE,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';

export {
  WIZARD_SECTION_LABEL,
  WIZARD_SECTION_LABEL_BASE,
  WizardAccentLabels,
  WizardSectionLabel,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';

export const ADDITIONAL_REQUIREMENTS_PLACEHOLDER =
  'Write any additional requirements or notes here...';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function parseIsoParts(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function monthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ProjectStartBookingNote({
  startTimeType,
  specificDate = '',
}: {
  startTimeType: string | null;
  specificDate?: string;
}) {
  const note = getProjectStartBookingNote(startTimeType, specificDate);
  if (!note) return null;
  return <p className={FORM_NOTE_BOX}>{note}</p>;
}

export function SpecificStartDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => isoToIndianDate(value));
  const minDate = todayLocalDateString();
  const maxDate = maxProjectStartDateString();
  const minYear = Number(minDate.slice(0, 4));
  const maxYear = Math.max(minYear + 1, Number(maxDate.slice(0, 4)));
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = minYear; year <= maxYear; year += 1) years.push(year);
    return years;
  }, [minYear, maxYear]);

  const complete = display.length === 10;
  const parsedIso = complete ? parseIndianDateToIso(display) : null;
  const formatError =
    complete && !parsedIso ? PROJECT_START_DATE_FORMAT_INVALID_MESSAGE : undefined;
  const rangeError = parsedIso ? getProjectStartDateFieldError(parsedIso) : undefined;
  const error = formatError ?? rangeError;
  const selectedIso =
    parsedIso && parsedIso >= minDate && parsedIso <= maxDate
      ? parsedIso
      : value && value >= minDate && value <= maxDate
        ? value
        : minDate;
  const selectedParts = parseIsoParts(selectedIso) ?? parseIsoParts(minDate)!;
  const [viewYear, setViewYear] = useState(selectedParts.year);
  const [viewMonth, setViewMonth] = useState(selectedParts.month);

  useEffect(() => {
    if (!value) return;
    const indian = isoToIndianDate(value);
    setDisplay((current) => (parseIndianDateToIso(current) === value ? current : indian));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const parts = parseIsoParts(selectedIso);
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, selectedIso]);

  function handleDisplayChange(raw: string) {
    const next = formatIndianDateInput(raw);
    setDisplay(next);
    if (!next) {
      onChange('');
      return;
    }
    if (next.length < 10) return;
    const iso = parseIndianDateToIso(next);
    onChange(iso ?? '');
  }

  function selectIso(iso: string) {
    if (iso < minDate || iso > maxDate) return;
    const clamped = clampProjectStartDateInput(iso);
    onChange(clamped);
    setDisplay(isoToIndianDate(clamped));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    const nextYear = date.getFullYear();
    if (nextYear < minYear || nextYear > maxYear) return;
    setViewYear(nextYear);
    setViewMonth(date.getMonth() + 1);
  }

  const cells = monthGrid(viewYear, viewMonth);
  const canGoPrev =
    viewYear > minYear || (viewYear === minYear && viewMonth > 1);
  const canGoNext =
    viewYear < maxYear || (viewYear === maxYear && viewMonth < 12);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-col gap-1.5 w-full">
        <label className={WIZARD_SECTION_LABEL_BASE}>
          {withSectionColon('Choose Start Date (DD/MM/YYYY)')}
        </label>
        <div ref={rootRef} className="relative">
          <div
            className={cn(
              'flex w-full overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-zinc-900',
              error
                ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/40'
                : 'border-gray-200 focus-within:ring-2 focus-within:ring-brand/50 focus-within:border-brand dark:border-zinc-800',
            )}
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              autoComplete="off"
              maxLength={10}
              value={display}
              onChange={(e) => handleDisplayChange(e.target.value)}
              aria-invalid={Boolean(error)}
              className={cn(
                'h-11 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base md:text-sm text-foreground',
                'placeholder:text-slate-400 shadow-none appearance-none',
                'dark:text-white dark:placeholder:text-zinc-500',
                'focus:outline-none focus:ring-0',
              )}
            />
            <button
              type="button"
              aria-label="Open calendar"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center border-l',
                error
                  ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'border-gray-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700',
              )}
            >
              <Calendar className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          {open && (
            <div
              role="dialog"
              aria-label="Choose start date"
              className="absolute right-0 z-50 mt-2 w-[18.5rem] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  disabled={!canGoPrev}
                  onClick={() => shiftMonth(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                    {MONTH_LABELS[viewMonth - 1]}
                  </span>
                  <div className="flex items-center gap-1" role="group" aria-label="Select year">
                    {yearOptions.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => setViewYear(year)}
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-semibold',
                          viewYear === year
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Next month"
                  disabled={!canGoNext}
                  onClick={() => shiftMonth(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500"
                  >
                    {label}
                  </div>
                ))}
                {cells.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} />;
                  }
                  const iso = toIsoDate(viewYear, viewMonth, day);
                  const disabled = iso < minDate || iso > maxDate;
                  const selected = iso === selectedIso && !error;
                  const isToday = iso === minDate;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectIso(iso)}
                      className={cn(
                        'h-8 rounded-lg text-sm font-medium',
                        disabled && 'cursor-not-allowed text-slate-300 dark:text-zinc-600',
                        !disabled && !selected && 'text-slate-700 hover:bg-blue-50 dark:text-zinc-200 dark:hover:bg-zinc-800',
                        selected && 'bg-blue-600 text-white hover:bg-blue-600',
                        isToday && !selected && !disabled && 'ring-1 ring-blue-400',
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">{error}</p>
        )}
      </div>
    </div>
  );
}

export function StartTimeAndNotes<T extends string = ProjectStartTimeType>({
  startTimeType,
  specificDate = '',
  additionalRequirements,
  onStartTimeChange,
  onSpecificDateChange,
  onNotesChange,
  notesPlaceholder,
  title = 'Project Starting Time',
  options = PROJECT_START_TIME_OPTIONS as unknown as { value: T; label: string }[],
  allowSpecificDate = true,
}: {
  startTimeType: T | null;
  specificDate?: string;
  additionalRequirements: string;
  onStartTimeChange: (value: T) => void;
  onSpecificDateChange?: (value: string) => void;
  onNotesChange: (value: string) => void;
  notesPlaceholder?: string;
  title?: string;
  options?: { value: T; label: string }[];
  allowSpecificDate?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className={FORM_SECTION_CARD}>
        <label className={WIZARD_SECTION_LABEL}>{withSectionColon(title)}</label>
        <OptionSelectGrid
          options={options}
          value={startTimeType}
          onSelect={onStartTimeChange}
          columns={2}
        />
        {allowSpecificDate && startTimeType === 'specific' && (
          <SpecificStartDateField
            value={specificDate}
            onChange={(next) => onSpecificDateChange?.(next)}
          />
        )}
        <ProjectStartBookingNote
          startTimeType={startTimeType}
          specificDate={specificDate}
        />
      </div>

      <div className={FORM_SECTION_CARD}>
        <label className={WIZARD_SECTION_LABEL}>
          <span>
            Additional Requirements <span className="normal-case tracking-normal">(optional)</span>:
          </span>
        </label>
        <textarea
          rows={3}
          placeholder={notesPlaceholder ?? ADDITIONAL_REQUIREMENTS_PLACEHOLDER}
          value={additionalRequirements}
          onChange={(e) => onNotesChange(e.target.value)}
          className={FORM_TEXTAREA}
        />
      </div>
    </div>
  );
}

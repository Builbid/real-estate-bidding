'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/owner/wizard/fieldValidation';
import {
  formatIndianDateInput,
  getProjectStartDateInputError,
  isoToIndianDate,
  isProjectStartDateBeyondOneMonth,
  maxProjectStartDateString,
  parseIndianDateToIso,
  PROJECT_START_DATE_BEYOND_MONTH_NOTE,
  projectStartPickerYears,
  todayLocalDateString,
} from '@/lib/projectStartTime';
import {
  WIZARD_SECTION_LABEL_BASE,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';

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
] as const;
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const days = daysInMonth(year, month);
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function partsFromValue(value: string): { day: number | null; month: number | null; year: number | null } {
  const parts = parseIsoParts(value);
  if (!parts) return { day: null, month: null, year: null };
  return { day: parts.day, month: parts.month, year: parts.year };
}

function displayFromParts(
  nextDay: number | null,
  nextMonth: number | null,
  nextYear: number | null,
): string {
  if (!nextDay) return '';
  const dayText = padDatePart(nextDay);
  if (!nextMonth) return `${dayText}/`;
  const monthText = padDatePart(nextMonth);
  if (!nextYear) return `${dayText}/${monthText}/`;
  return `${dayText}/${monthText}/${nextYear}`;
}

export function ProjectStartDatePicker({
  value,
  onChange,
  error: externalError,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const minDate = todayLocalDateString();
  const maxDate = maxProjectStartDateString();
  const yearOptions = useMemo(() => projectStartPickerYears(), [minDate]);
  const yearOptionSet = useMemo(() => new Set(yearOptions), [yearOptions]);
  const pickerMinYear = yearOptions[0];
  const pickerMaxYear = yearOptions[1];
  const initialParts = partsFromValue(value);
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => isoToIndianDate(value));
  const [day, setDay] = useState<number | null>(initialParts.day);
  const [month, setMonth] = useState<number | null>(initialParts.month);
  const [year, setYear] = useState<number | null>(initialParts.year);

  const todayParts = parseIsoParts(minDate) ?? { year: pickerMinYear, month: 1, day: 1 };
  const [viewYear, setViewYear] = useState(year ?? todayParts.year);
  const [viewMonth, setViewMonth] = useState(month ?? todayParts.month);

  useEffect(() => {
    if (!value) return;
    const indian = isoToIndianDate(value);
    setDisplay((current) => (parseIndianDateToIso(current) === value ? current : indian));
    const parts = partsFromValue(value);
    setDay(parts.day);
    setMonth(parts.month);
    setYear(parts.year);
  }, [value]);

  const error = externalError || getProjectStartDateInputError(display);
  const parsedIso = parseIndianDateToIso(display);
  const selectedIso = parsedIso ?? value ?? '';
  const showTokenNotice = Boolean(parsedIso && !error && isProjectStartDateBeyondOneMonth(parsedIso));

  const cells = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const canGoPrev = viewYear > pickerMinYear || (viewYear === pickerMinYear && viewMonth > 1);
  const canGoNext = viewYear < pickerMaxYear || (viewYear === pickerMaxYear && viewMonth < 12);

  function emitParts(nextDay: number | null, nextMonth: number | null, nextYear: number | null) {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    const nextDisplay = displayFromParts(nextDay, nextMonth, nextYear);
    setDisplay(nextDisplay);
    const iso = parseIndianDateToIso(nextDisplay);
    onChange(iso ?? '');
    if (nextMonth) setViewMonth(nextMonth);
    if (nextYear && yearOptionSet.has(nextYear)) setViewYear(nextYear);
  }

  function handleDisplayChange(raw: string) {
    const next = formatIndianDateInput(raw, display);
    setDisplay(next);
    if (!next) {
      setDay(null);
      setMonth(null);
      setYear(null);
      onChange('');
      return;
    }
    const parts = next.split('/');
    const typedDay = parts[0]?.length === 2 ? Number(parts[0]) : NaN;
    const typedMonth = parts[1]?.length === 2 ? Number(parts[1]) : NaN;
    const typedYear = parts[2]?.length === 4 ? Number(parts[2]) : NaN;
    if (typedDay >= 1 && typedDay <= 31) setDay(typedDay);
    if (typedMonth >= 1 && typedMonth <= 12) setMonth(typedMonth);
    if (yearOptionSet.has(typedYear)) {
      setYear(typedYear);
      setViewYear(typedYear);
    }
    if (typedMonth >= 1 && typedMonth <= 12) setViewMonth(typedMonth);

    if (next.replace(/\D/g, '').length < 8) {
      if (getProjectStartDateInputError(next)) onChange('');
      return;
    }
    const iso = parseIndianDateToIso(next);
    onChange(iso ?? '');
  }

  function selectIso(iso: string) {
    if (iso < minDate || iso > maxDate) return;
    const parts = parseIsoParts(iso);
    if (!parts) return;
    emitParts(parts.day, parts.month, parts.year);
    setViewYear(parts.year);
    setViewMonth(parts.month);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    const nextYear = date.getFullYear();
    if (nextYear < pickerMinYear || nextYear > pickerMaxYear) return;
    setViewYear(nextYear);
    setViewMonth(date.getMonth() + 1);
  }

  function onCalendarOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;
    const parts = parseIsoParts(selectedIso) ?? todayParts;
    const nextYear = yearOptionSet.has(parts.year) ? parts.year : todayParts.year;
    setViewYear(nextYear);
    setViewMonth(parts.month);
  }

  const triggerClass = cn(
    'h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-slate-100',
    'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:border-sky-400',
    error
      ? 'border-red-500 ring-1 ring-red-500'
      : 'border-slate-300 dark:border-slate-700',
  );

  return (
    <div className="mt-2 space-y-2" data-field-invalid={error ? 'true' : undefined}>
      <div className="flex flex-col gap-1.5 w-full">
        <label className={WIZARD_SECTION_LABEL_BASE}>
          {withSectionColon('Choose Start Date (DD/MM/YYYY)')}
        </label>
        <div
          className={cn(
            'flex w-full overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-800/80',
            error
              ? 'border-red-500 ring-1 ring-red-500 focus-within:ring-2 focus-within:ring-red-500'
              : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:focus-within:border-sky-400',
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
              'h-11 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base text-slate-900 md:text-sm',
              'placeholder:text-slate-500 shadow-none appearance-none',
              'dark:text-slate-100 dark:placeholder:text-slate-400',
              'focus:outline-none focus:ring-0',
            )}
          />
          <Popover open={open} onOpenChange={onCalendarOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Open calendar"
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center border-l',
                  error
                    ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
              >
                <Calendar className="h-5 w-5" strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-[80] w-[18.5rem] rounded-2xl border-gray-200 p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
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
                    {yearOptions.map((optionYear) => (
                      <button
                        key={optionYear}
                        type="button"
                        onClick={() => setViewYear(optionYear)}
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-semibold',
                          viewYear === optionYear
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                        )}
                      >
                        {optionYear}
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
                {cells.map((gridDay, index) => {
                  if (!gridDay) {
                    return <div key={`empty-${index}`} />;
                  }
                  const iso = toIsoDate(viewYear, viewMonth, gridDay);
                  const disabled = iso < minDate || iso > maxDate;
                  const selected = Boolean(parsedIso) && iso === parsedIso && !error;
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
                      {gridDay}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="min-w-0 space-y-1">
            <p className="px-0.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Day</p>
            <Select
              value={day ? String(day) : undefined}
              onValueChange={(next) => emitParts(Number(next), month, year)}
            >
              <SelectTrigger aria-label="Day" className={triggerClass}>
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent side="top" position="item-aligned" className="z-[80] max-h-64">
                {DAY_OPTIONS.map((optionDay) => (
                  <SelectItem key={optionDay} value={String(optionDay)}>
                    {optionDay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="px-0.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Month</p>
            <Select
              value={month ? String(month) : undefined}
              onValueChange={(next) => emitParts(day, Number(next), year)}
            >
              <SelectTrigger aria-label="Month" className={triggerClass}>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent side="top" position="item-aligned" className="z-[80] max-h-64">
                {MONTH_LABELS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="px-0.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Year</p>
            <Select
              value={year ? String(year) : undefined}
              onValueChange={(next) => emitParts(day, month, Number(next))}
            >
              <SelectTrigger aria-label="Year" className={triggerClass}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent side="top" position="item-aligned" className="z-[80]">
                {yearOptions.map((optionYear) => (
                  <SelectItem key={optionYear} value={String(optionYear)}>
                    {optionYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <FieldError message={error} />
        {showTokenNotice && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
            {PROJECT_START_DATE_BEYOND_MONTH_NOTE}
          </p>
        )}
      </div>
    </div>
  );
}

export function SpecificStartDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ProjectStartDatePicker value={value} onChange={onChange} />;
}

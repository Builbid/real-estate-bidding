'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/owner/wizard/fieldValidation';
import {
  isoToIndianDate,
  parseIndianDateToIso,
  PROJECT_START_DATE_FORMAT_INVALID_MESSAGE,
  upcomingCalendarYears,
} from '@/lib/projectStartTime';

function padDatePart(value: string): string {
  return value.padStart(2, '0');
}

function partsFromIso(iso: string): { day: string; month: string; year: string } {
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { day: '', month: '', year: '' };
  return {
    day: String(Number(match[3])),
    month: String(Number(match[2])),
    year: match[1],
  };
}

function formatDropdownDate(day: string, month: string, year: string): string {
  if (!day || !month || !year) return '';
  return `${padDatePart(day)}/${padDatePart(month)}/${year}`;
}

const PART_SELECT_CLASS =
  'h-11 min-w-0 flex-1 cursor-pointer appearance-auto border-0 bg-transparent px-1 text-center text-base text-slate-900 md:text-sm dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-0';

export function IndianDateDropdownInput({
  value,
  onChange,
  error: externalError,
  note,
  yearSpan = 20,
}: {
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  note?: ReactNode;
  yearSpan?: number;
}) {
  const initial = partsFromIso(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  useEffect(() => {
    if (!value) return;
    const next = partsFromIso(value);
    if (!next.year) return;
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const years = useMemo(() => {
    const options = upcomingCalendarYears(yearSpan);
    if (year && !options.includes(Number(year))) {
      return [...options, Number(year)].sort((a, b) => a - b);
    }
    return options;
  }, [year, yearSpan]);

  const formatted = formatDropdownDate(day, month, year);
  const parsedIso = formatted ? parseIndianDateToIso(formatted) : null;
  const formatError =
    formatted && !parsedIso ? PROJECT_START_DATE_FORMAT_INVALID_MESSAGE : undefined;
  const shownError = externalError || formatError;

  function commit(nextDay: string, nextMonth: string, nextYear: string) {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    const nextFormatted = formatDropdownDate(nextDay, nextMonth, nextYear);
    if (!nextFormatted) {
      onChange('');
      return;
    }
    onChange(parseIndianDateToIso(nextFormatted) ?? '');
  }

  return (
    <div data-field-invalid={shownError ? 'true' : undefined}>
      <div
        className={cn(
          'flex h-11 w-full items-center overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-800/80',
          shownError
            ? 'border-red-500 ring-1 ring-red-500 focus-within:ring-2 focus-within:ring-red-500'
            : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:focus-within:border-sky-400',
        )}
      >
        <select
          aria-label="Day"
          value={day}
          onChange={(event) => commit(event.target.value, month, year)}
          className={PART_SELECT_CLASS}
        >
          <option value="">DD</option>
          {Array.from({ length: 31 }, (_, index) => {
            const number = String(index + 1);
            return (
              <option key={number} value={number}>
                {padDatePart(number)}
              </option>
            );
          })}
        </select>
        <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500" aria-hidden>
          /
        </span>
        <select
          aria-label="Month"
          value={month}
          onChange={(event) => commit(day, event.target.value, year)}
          className={PART_SELECT_CLASS}
        >
          <option value="">MM</option>
          {Array.from({ length: 12 }, (_, index) => {
            const number = String(index + 1);
            return (
              <option key={number} value={number}>
                {padDatePart(number)}
              </option>
            );
          })}
        </select>
        <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500" aria-hidden>
          /
        </span>
        <select
          aria-label="Year"
          value={year}
          onChange={(event) => commit(day, month, event.target.value)}
          className={PART_SELECT_CLASS}
        >
          <option value="">YYYY</option>
          {years.map((optionYear) => (
            <option key={optionYear} value={String(optionYear)}>
              {optionYear}
            </option>
          ))}
        </select>
        <input type="hidden" value={formatted || isoToIndianDate(parsedIso)} readOnly />
      </div>
      {note}
      <FieldError message={shownError} />
    </div>
  );
}

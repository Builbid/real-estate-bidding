'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { FORM_NOTE_BOX, FORM_SECTION_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';
import {
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
  const rangeError = parsedIso ? getProjectStartDateFieldError(parsedIso) : undefined;
  const error = formatError ?? rangeError;

  function handleDisplayChange(raw: string) {
    const next = formatIndianDateInput(raw);
    setDisplay(next);
    if (!next) {
      onChange('');
      return;
    }
    const iso = parseIndianDateToIso(next);
    onChange(iso ?? '');
  }

  function handlePickerChange(iso: string) {
    onChange(iso);
    setDisplay(isoToIndianDate(iso));
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
    <div className="mt-2 space-y-2">
      <div className="flex flex-col gap-1.5 w-full">
        <label className={WIZARD_SECTION_LABEL_BASE}>
          {withSectionColon('Choose Start Date (DD/MM/YYYY)')}
        </label>
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
          <div className="relative h-11 w-11 shrink-0">
            <input
              ref={pickerRef}
              type="date"
              min={todayLocalDateString()}
              max={maxProjectStartDateString()}
              value={parsedIso && !rangeError ? parsedIso : ''}
              onChange={(e) => handlePickerChange(e.target.value)}
              aria-hidden
              tabIndex={-1}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
            />
            <button
              type="button"
              aria-label="Open calendar"
              onClick={openCalendar}
              className={cn(
                'flex h-11 w-11 items-center justify-center border-l',
                error
                  ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'border-gray-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700',
              )}
            >
              <Calendar className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
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

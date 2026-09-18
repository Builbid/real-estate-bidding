'use client';

import { Input } from '@/components/ui/input';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { FORM_SECTION_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
import {
  PROJECT_START_TIME_OPTIONS,
  todayLocalDateString,
  type ProjectStartTimeType,
} from '@/lib/projectStartTime';

export const WIZARD_SECTION_LABEL =
  "mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 before:inline-block before:h-2 before:w-2 before:flex-shrink-0 before:rounded-full before:bg-brand before:content-['']";

export const ADDITIONAL_REQUIREMENTS_PLACEHOLDER =
  'Write any additional requirements or notes here...';

export function withSectionColon(label: string): string {
  const trimmed = label.trim();
  if (!trimmed || /[?:]$/.test(trimmed)) return trimmed;
  return `${trimmed}:`;
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
          <Input
            label="Specific Start Date"
            type="date"
            min={todayLocalDateString()}
            value={specificDate}
            onChange={(e) => onSpecificDateChange?.(e.target.value)}
            className="mt-2"
          />
        )}
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

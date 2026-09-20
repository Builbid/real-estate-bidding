'use client';

import { Input } from '@/components/ui/input';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { FORM_SECTION_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
import {
  clampProjectStartDateInput,
  maxProjectStartDateString,
  PROJECT_START_DATE_BOOKING_NOTE,
  PROJECT_START_TIME_OPTIONS,
  todayLocalDateString,
  type ProjectStartTimeType,
} from '@/lib/projectStartTime';
import {
  WIZARD_SECTION_LABEL,
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

const BOOKING_NOTE_CLASS =
  'rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-slate-600 dark:border-slate-700/30 dark:bg-slate-800/40 dark:text-slate-300';

export function SpecificStartDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <Input
        label="Specific Start Date"
        accentLabel
        type="date"
        min={todayLocalDateString()}
        max={maxProjectStartDateString()}
        value={value}
        onChange={(e) => onChange(clampProjectStartDateInput(e.target.value))}
      />
      <p className={BOOKING_NOTE_CLASS}>{PROJECT_START_DATE_BOOKING_NOTE}</p>
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

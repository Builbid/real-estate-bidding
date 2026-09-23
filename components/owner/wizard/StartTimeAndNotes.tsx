'use client';

import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { messageMatches } from '@/components/owner/wizard/fieldValidation';
import { FORM_NOTE_BOX, FORM_SECTION_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';
import { ProjectStartDatePicker } from '@/components/owner/wizard/ProjectStartDatePicker';
import {
  getProjectStartBookingNote,
  PROJECT_START_TIME_OPTIONS,
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

export {
  ProjectStartDatePicker,
  SpecificStartDateField,
} from '@/components/owner/wizard/ProjectStartDatePicker';

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

export function StartTimeAndNotes<T extends string = ProjectStartTimeType>({
  startTimeType,
  specificDate = '',
  additionalRequirements,
  onStartTimeChange,
  onSpecificDateChange,
  onNotesChange,
  notesPlaceholder,
  title = 'Work Start Timeline',
  options = PROJECT_START_TIME_OPTIONS as unknown as { value: T; label: string }[],
  allowSpecificDate = true,
  error = null,
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
  error?: string | null;
}) {
  const choiceInvalid = messageMatches(error, 'when the project should start');
  const dateInvalid =
    messageMatches(error, 'specific project start date') ||
    messageMatches(error, 'start date') ||
    messageMatches(error, 'past date') ||
    messageMatches(error, 'valid date');
  return (
    <div className="space-y-4">
      <div
        className={cn(FORM_SECTION_CARD, choiceInvalid && 'ring-1 ring-red-500')}
        data-field-invalid={choiceInvalid ? 'true' : undefined}
      >
        <label className={WIZARD_SECTION_LABEL}>{withSectionColon(title)}</label>
        <OptionSelectGrid
          options={options}
          value={startTimeType}
          onSelect={onStartTimeChange}
          columns={2}
        />
        {allowSpecificDate && startTimeType === 'specific' && (
          <ProjectStartDatePicker
            value={specificDate}
            error={dateInvalid ? error ?? undefined : undefined}
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

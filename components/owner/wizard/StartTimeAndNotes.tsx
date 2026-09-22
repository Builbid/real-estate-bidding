'use client';

import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { FORM_NOTE_BOX, FORM_SECTION_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
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
          <ProjectStartDatePicker
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

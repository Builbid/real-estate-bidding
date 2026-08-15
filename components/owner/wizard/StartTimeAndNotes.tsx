'use client';

import { Input } from '@/components/ui/input';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import {
  PROJECT_START_TIME_OPTIONS,
  type ProjectStartTimeType,
} from '@/lib/projectStartTime';

export const WIZARD_SECTION_LABEL =
  'text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider';

export function StartTimeAndNotes({
  startTimeType,
  specificDate,
  additionalRequirements,
  onStartTimeChange,
  onSpecificDateChange,
  onNotesChange,
  notesPlaceholder,
}: {
  startTimeType: ProjectStartTimeType | null;
  specificDate: string;
  additionalRequirements: string;
  onStartTimeChange: (value: ProjectStartTimeType) => void;
  onSpecificDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  notesPlaceholder?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className={WIZARD_SECTION_LABEL}>Project Starting Time</label>
        <OptionSelectGrid
          options={PROJECT_START_TIME_OPTIONS}
          value={startTimeType}
          onSelect={onStartTimeChange}
          columns={2}
        />
        {startTimeType === 'specific' && (
          <Input
            label="Specific Start Date"
            type="date"
            value={specificDate}
            onChange={(e) => onSpecificDateChange(e.target.value)}
            className="mt-2"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={WIZARD_SECTION_LABEL}>
          Additional Requirements <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder={
            notesPlaceholder ??
            'Specify any custom instructions or details not covered above...'
          }
          value={additionalRequirements}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        />
      </div>
    </div>
  );
}

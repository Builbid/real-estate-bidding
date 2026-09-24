'use client';

import { IndianDateDropdownInput } from '@/components/owner/wizard/IndianDateDropdownInput';
import {
  getProjectStartDateFieldError,
  isProjectStartDateBeyondOneMonth,
  PROJECT_START_DATE_BEYOND_MONTH_NOTE,
} from '@/lib/projectStartTime';
import {
  WIZARD_SECTION_LABEL_BASE,
  withSectionColon,
} from '@/components/owner/wizard/WizardSectionLabel';

export function ProjectStartDatePicker({
  value,
  onChange,
  error: externalError,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const rangeError = value ? getProjectStartDateFieldError(value) : undefined;
  const error = externalError || rangeError;
  const showTokenNotice = Boolean(value && !error && isProjectStartDateBeyondOneMonth(value));

  return (
    <div className="mt-2">
      <div className="flex w-full flex-col gap-1">
        <label className={WIZARD_SECTION_LABEL_BASE}>
          {withSectionColon('Choose Work Start Date (DD/MM/YYYY)')}
        </label>
        <IndianDateDropdownInput
          value={value}
          onChange={onChange}
          error={error}
          note={
            showTokenNotice ? (
              <p className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {PROJECT_START_DATE_BEYOND_MONTH_NOTE}
              </p>
            ) : null
          }
        />
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

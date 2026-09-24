'use client';

import { IndianDateDropdownInput } from '@/components/owner/wizard/IndianDateDropdownInput';

export function IndianContractDateField({
  label,
  value,
  onChange,
  minIso,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minIso?: string;
  error?: string;
}) {
  const rangeError =
    value && minIso && value < minIso
      ? 'This date cannot be earlier than the start date.'
      : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{label}</label>
      <IndianDateDropdownInput
        value={value}
        onChange={onChange}
        error={error ?? rangeError}
      />
    </div>
  );
}

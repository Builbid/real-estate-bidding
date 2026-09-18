'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CUSTOM_FLOOR_INPUT_HELPER } from '@/lib/mistriDetails';
import { removeCustomFloor, tryAddCustomFloor } from '@/lib/customFloors';

export function CustomFloorTagInput({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: number[];
  onChange: (floors: number[]) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = error || localError;

  function addFloor() {
    const result = tryAddCustomFloor(value, draft);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    if (result.added) onChange(result.floors);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addFloor();
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
        Custom floor numbers (above 4th)
      </label>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="e.g. 5"
          value={draft}
          disabled={disabled}
          aria-label="Floor number above 4th"
          onChange={(event) => {
            setDraft(event.target.value.replace(/\D/g, ''));
            if (localError) setLocalError(null);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'flex h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-foreground shadow-sm appearance-none md:text-sm placeholder:text-slate-600',
            'dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400 dark:shadow-none dark:[color-scheme:dark]',
            'ring-offset-background transition-all duration-150',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            shownError && 'border-red-500/70 focus:ring-red-500/40',
          )}
        />
        <Button
          type="button"
          onClick={addFloor}
          disabled={disabled}
          className="h-11 shrink-0 rounded-xl px-3 text-sm sm:px-4"
        >
          + Add Floor
        </Button>
      </div>
      {shownError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{shownError}</p>
      ) : null}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((floor) => (
            <span
              key={floor}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:bg-blue-900/30 dark:text-white"
            >
              Floor {floor}
              <button
                type="button"
                aria-label={`Remove floor ${floor}`}
                disabled={disabled}
                onClick={() => {
                  setLocalError(null);
                  onChange(removeCustomFloor(value, floor));
                }}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-blue-200/80 hover:text-slate-900 disabled:opacity-50 dark:text-blue-100 dark:hover:bg-blue-800"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-[11px] font-medium leading-snug text-muted-foreground">
        {CUSTOM_FLOOR_INPUT_HELPER}
      </p>
    </div>
  );
}

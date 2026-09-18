'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FORM_CONTINUE_BTN } from '@/components/owner/wizard/formTheme';
import { cn } from '@/lib/utils';
import { CUSTOM_FLOOR_INPUT_HELPER } from '@/lib/mistriDetails';
import {
  MIN_CUSTOM_RCC_FLOOR,
  SELECTABLE_CUSTOM_RCC_FLOOR_MAX,
  mergeSelectableCustomFloors,
  removeCustomFloor,
  selectableCustomFloorNumbers,
} from '@/lib/customFloors';

const FLOOR_OPTIONS = selectableCustomFloorNumbers();

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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(
      value.filter(
        (floor) =>
          floor >= MIN_CUSTOM_RCC_FLOOR && floor <= SELECTABLE_CUSTOM_RCC_FLOOR_MAX,
      ),
    );
  }, [open, value]);

  function toggleFloor(floor: number) {
    setDraft((current) =>
      current.includes(floor)
        ? current.filter((item) => item !== floor)
        : [...current, floor].sort((a, b) => a - b),
    );
  }

  function confirmSelection() {
    onChange(mergeSelectableCustomFloors(value, draft));
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
        Custom floor numbers (above 4th)
      </label>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div
          className={cn(
            'flex min-h-12 flex-wrap content-start gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-2 dark:border-zinc-700 dark:bg-zinc-950/40',
            error && 'border-red-500/70',
          )}
        >
          {value.length > 0 ? (
            value.map((floor) => (
              <span
                key={floor}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:bg-blue-900/30 dark:text-white"
              >
                Floor {floor}
                <button
                  type="button"
                  aria-label={`Remove floor ${floor}`}
                  disabled={disabled}
                  onClick={() => onChange(removeCustomFloor(value, floor))}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-blue-200/80 hover:text-slate-900 disabled:opacity-50 dark:text-blue-100 dark:hover:bg-blue-800"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </span>
            ))
          ) : (
            <p className="self-center px-1 text-xs font-medium text-slate-500 dark:text-zinc-400">
              No custom floors selected
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setDraft(
              value.filter(
                (floor) =>
                  floor >= MIN_CUSTOM_RCC_FLOOR &&
                  floor <= SELECTABLE_CUSTOM_RCC_FLOOR_MAX,
              ),
            );
            setOpen(true);
          }}
          className="h-12 w-full rounded-xl text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Floor
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <p className="text-[11px] font-medium leading-snug text-muted-foreground">
        {CUSTOM_FLOOR_INPUT_HELPER}
      </p>

      {open ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className={cn(
              'flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0',
              'left-3 right-3 top-auto w-auto max-w-none translate-x-0 translate-y-0 bottom-3',
              'sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%]',
            )}
          >
          <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-12 dark:border-zinc-800">
            <DialogTitle>Select floors above 4th</DialogTitle>
            <DialogDescription>
              Choose Floor {MIN_CUSTOM_RCC_FLOOR} through Floor {SELECTABLE_CUSTOM_RCC_FLOOR_MAX}.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {FLOOR_OPTIONS.map((floor) => {
                const selected = draft.includes(floor);
                return (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => toggleFloor(floor)}
                    aria-label={`Floor ${floor}`}
                    aria-pressed={selected}
                    className={cn(
                      'flex min-h-12 w-full items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-all duration-150',
                      'active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                      selected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-blue-500/50 dark:hover:bg-blue-950/40',
                    )}
                  >
                    {floor}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950">
            <Button
              type="button"
              onClick={confirmSelection}
              className={cn(FORM_CONTINUE_BTN, 'h-12 w-full rounded-xl text-sm')}
            >
              Add Selected Floors
              {draft.length > 0 ? ` (${draft.length})` : ''}
            </Button>
          </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

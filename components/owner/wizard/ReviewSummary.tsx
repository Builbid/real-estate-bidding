'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  FORM_PROGRESS_CURRENT,
  FORM_PROGRESS_DONE,
  FORM_PROGRESS_IDLE,
  FORM_PROGRESS_LINE,
  FORM_REVIEW_HIGHLIGHT,
  FORM_REVIEW_LABEL,
  FORM_REVIEW_ROW,
  FORM_REVIEW_VALUE,
} from '@/components/owner/wizard/formTheme';

export function WizardStepper({
  labels,
  step,
}: {
  labels: readonly string[];
  step: number;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
          <div
            className={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
              i + 1 < step
                ? FORM_PROGRESS_DONE
                : i + 1 === step
                  ? FORM_PROGRESS_CURRENT
                  : FORM_PROGRESS_IDLE,
            )}
          >
            {i + 1 < step ? '✓' : i + 1}
          </div>
          <span
            className={cn(
              'truncate text-[10px] sm:text-xs',
              i + 1 === step ? 'font-semibold text-slate-900' : 'font-medium text-slate-500',
            )}
          >
            {label}
          </span>
          {i < labels.length - 1 && <div className={FORM_PROGRESS_LINE} />}
        </div>
      ))}
    </div>
  );
}

export type ReviewSummaryItem = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
};

function isFloorOrSectionLabel(label: string) {
  return (
    label === 'Assam Type' ||
    label.startsWith('RCC ') ||
    /floor/i.test(label) ||
    /package/i.test(label)
  );
}

export function ReviewSummaryList({ items }: { items: ReviewSummaryItem[] }) {
  return (
    <div>
      {items.map((item) => {
        const highlight = item.highlight ?? isFloorOrSectionLabel(item.label);
        return (
          <div
            key={item.label}
            className={cn(FORM_REVIEW_ROW, highlight && FORM_REVIEW_HIGHLIGHT)}
          >
            <span className={cn(FORM_REVIEW_LABEL, highlight && 'text-brand')}>
              {item.label}
            </span>
            <div className={cn(FORM_REVIEW_VALUE, highlight && 'text-brand')}>
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Universal new-project field label: blue accent bullet + bold title-case text.
 * Matches the Bidding Duration treatment in both light and dark mode.
 */
export const WIZARD_SECTION_LABEL_BASE =
  "flex items-center gap-2 text-base font-bold tracking-normal normal-case text-blue-600 dark:text-blue-400 before:inline-block before:h-2 before:w-2 before:flex-shrink-0 before:rounded-full before:bg-blue-600 dark:before:bg-blue-400 before:content-['']";

export const WIZARD_SECTION_LABEL = `mb-3 ${WIZARD_SECTION_LABEL_BASE}`;

export function withSectionColon(label: string): string {
  const trimmed = label.trim();
  if (!trimmed || /[?:]$/.test(trimmed)) return trimmed;
  return `${trimmed}:`;
}

const WizardAccentLabelContext = createContext(false);

export function WizardAccentLabels({ children }: { children: ReactNode }) {
  return (
    <WizardAccentLabelContext.Provider value={true}>
      {children}
    </WizardAccentLabelContext.Provider>
  );
}

export function useWizardAccentLabel(override?: boolean): boolean {
  const fromContext = useContext(WizardAccentLabelContext);
  if (override != null) return override;
  return fromContext;
}

export function WizardSectionLabel({
  children,
  htmlFor,
  className,
  as: Comp = 'label',
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  as?: 'label' | 'p' | 'span';
}) {
  return (
    <Comp htmlFor={htmlFor} className={cn(WIZARD_SECTION_LABEL, className)}>
      {children}
    </Comp>
  );
}

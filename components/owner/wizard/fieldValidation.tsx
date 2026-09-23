'use client';

import { useEffect } from 'react';

/** Reserved line so an error message cannot push the next field down. */
export function FieldError({ message }: { message?: string | null }) {
  return (
    <p
      className="min-h-[20px] text-xs font-medium leading-5 text-red-600 dark:text-red-400"
      role={message ? 'alert' : undefined}
    >
      {message || '\u00a0'}
    </p>
  );
}

export function messageMatches(message: string | null | undefined, snippet: string) {
  return Boolean(message?.toLowerCase().includes(snippet.toLowerCase()));
}

export function invalidAttr(message: string | null | undefined, snippet: string) {
  return messageMatches(message, snippet) ? 'true' : undefined;
}

export const INVALID_CONTROL_CLASS =
  'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500 dark:border-red-500 dark:ring-red-500';

export const INVALID_SECTION_CLASS = 'ring-1 ring-red-500 dark:ring-red-500';

export function scrollToFirstInvalidField(root?: ParentNode | null) {
  const scope = root ?? (typeof document !== 'undefined' ? document : null);
  if (!scope) return;

  const marked = [...scope.querySelectorAll<HTMLElement>('[data-field-invalid="true"]')];
  const target =
    marked.find((element) => element.getAttribute('data-validation-banner') !== 'true') ??
    marked[0];
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = target.matches('input, textarea, select, button')
    ? target
    : target.querySelector<HTMLElement>('input, textarea, select, button');
  focusable?.focus({ preventScroll: true });
}

/** Scroll after the validation state has been painted. */
export function useScrollToFirstInvalid(token: number) {
  useEffect(() => {
    if (token === 0) return;
    scrollToFirstInvalidField();
  }, [token]);
}

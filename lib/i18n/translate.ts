import type { Locale } from './types';
import type { Messages } from './messages/en';
import { en } from './messages/en';
import { as } from './messages/as';

export type { Messages } from './messages/en';
const MESSAGES: Record<Locale, Messages> = { en, as };
export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? en;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const messages = getMessages(locale);
  const parts = key.split('.');
  let value: unknown = messages;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') return key;

  if (!params) return value;

  return Object.entries(params).reduce(
    (str, [paramKey, paramValue]) =>
      str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
    value,
  );
}

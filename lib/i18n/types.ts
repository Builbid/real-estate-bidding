export type Locale = 'en' | 'as';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'builbid-locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  as: 'অসমীয়া',
};

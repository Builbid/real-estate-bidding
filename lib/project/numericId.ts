import { isNumericProjectId } from '@/lib/documents/constants';

/** Allocate a 6-digit numeric project ID (100000–999999). */
export function generateNumericProjectId(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function formatNumericProjectId(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (isNumericProjectId(raw)) return raw;
  return '—';
}

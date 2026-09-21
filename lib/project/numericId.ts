import { isNumericProjectId, isPublicProjectId } from '@/lib/documents/constants';

const PUBLIC_ID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Allocate a public project ID: 4 letters + 4 digits (e.g. K7M2Q9P1). */
export function generateNumericProjectId(): string {
  let out = '';
  for (let i = 0; i < 4; i += 1) {
    out += PUBLIC_ID_LETTERS[Math.floor(Math.random() * PUBLIC_ID_LETTERS.length)];
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

export function formatNumericProjectId(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (isPublicProjectId(raw)) return raw.toUpperCase();
  if (isNumericProjectId(raw)) return raw;
  return '—';
}

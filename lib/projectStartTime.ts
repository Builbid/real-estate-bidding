// Shared project starting-time options used by trade + drawing wizards

export type ProjectStartTimeType = '1week' | '2week' | '1month' | 'specific';

export const PROJECT_START_TIME_OPTIONS: {
  value: ProjectStartTimeType;
  label: string;
}[] = [
  { value: '1week', label: 'Within 1 week' },
  { value: '2week', label: 'Within 2 weeks' },
  { value: '1month', label: 'Within 1 month' },
  { value: 'specific', label: 'Specific Date' },
];

export const PROJECT_START_DATE_PAST_INVALID_MESSAGE =
  'Select today or a future date. Past dates are not allowed.';
export const PROJECT_START_DATE_RANGE_INVALID_MESSAGE =
  'Project start date cannot exceed 90 days from today.';
export const PROJECT_START_DATE_FORMAT_INVALID_MESSAGE =
  'Enter a valid date as DD/MM/YYYY.';
export const PROJECT_START_DATE_BEYOND_MONTH_NOTE =
  'Note: Projects scheduled beyond 30 days require a small advance token money deposit during contract agreement. To avoid any advance charges, please schedule your project start date within 30 days.';

const START_TIME_TYPES = new Set<ProjectStartTimeType>([
  '1week',
  '2week',
  '1month',
  'specific',
]);

export function isProjectStartTimeType(
  value: unknown,
): value is ProjectStartTimeType {
  return typeof value === 'string' && START_TIME_TYPES.has(value as ProjectStartTimeType);
}

export function projectStartPickerYears(now: Date = new Date()): [number, number] {
  const year = now.getFullYear();
  return [year, year + 1];
}

/** Local calendar date as YYYY-MM-DD (for `<input type="date" min>`). */
export function todayLocalDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local calendar date exactly 90 days from today as YYYY-MM-DD. */
export function maxProjectStartDateString(now: Date = new Date()): string {
  return todayLocalDateString(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90),
  );
}

/** Local calendar date exactly 30 days from today as YYYY-MM-DD. */
export function oneMonthProjectStartDateString(now: Date = new Date()): string {
  return todayLocalDateString(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30),
  );
}

/** True when value is a valid YYYY-MM-DD on or after today (local). */
export function isProjectStartDateNotInPast(
  value: string,
  now: Date = new Date(),
): boolean {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= todayLocalDateString(now);
}

/** True when value is a valid local date from today through 90 days from today. */
export function isProjectStartDateWithinRange(
  value: string,
  now: Date = new Date(),
): boolean {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= todayLocalDateString(now) && date <= maxProjectStartDateString(now);
}

/** True when a specific date is today through 30 days from today. */
export function isProjectStartDateWithinOneMonth(
  value: string,
  now: Date = new Date(),
): boolean {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= todayLocalDateString(now) && date <= oneMonthProjectStartDateString(now);
}

/** True when a specific date is 31–90 days from today. */
export function isProjectStartDateBeyondOneMonth(
  value: string,
  now: Date = new Date(),
): boolean {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date > oneMonthProjectStartDateString(now) && date <= maxProjectStartDateString(now);
}

/** Real-time field error for a typed or picked start date (ISO YYYY-MM-DD). */
export function getProjectStartDateFieldError(
  value: string,
  now: Date = new Date(),
): string | undefined {
  const date = value.trim();
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  if (date < todayLocalDateString(now)) return PROJECT_START_DATE_PAST_INVALID_MESSAGE;
  if (date > maxProjectStartDateString(now)) return PROJECT_START_DATE_RANGE_INVALID_MESSAGE;
  return undefined;
}

/** Real-time error for a DD/MM/YYYY (or partial) typed value. */
export function getProjectStartDateInputError(
  display: string,
  now: Date = new Date(),
): string | undefined {
  const trimmed = display.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 2) {
    const day = Number(digits.slice(0, 2));
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      return PROJECT_START_DATE_FORMAT_INVALID_MESSAGE;
    }
  }
  if (digits.length >= 4) {
    const month = Number(digits.slice(2, 4));
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return PROJECT_START_DATE_FORMAT_INVALID_MESSAGE;
    }
  }
  if (digits.length < 8) return undefined;
  const iso = parseIndianDateToIso(
    `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`,
  );
  if (!iso) return PROJECT_START_DATE_FORMAT_INVALID_MESSAGE;
  return getProjectStartDateFieldError(iso, now);
}

export function getProjectStartBookingNote(
  type: string | null | undefined,
  specificDate?: string | null,
): string | null {
  if (type === 'specific' && isProjectStartDateBeyondOneMonth(specificDate ?? '')) {
    return PROJECT_START_DATE_BEYOND_MONTH_NOTE;
  }
  return null;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INDIAN_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Convert stored YYYY-MM-DD to DD/MM/YYYY. */
export function isoToIndianDate(value: string | null | undefined): string {
  const iso = value?.trim() ?? '';
  if (!ISO_DATE_RE.test(iso)) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** Keep typed Indian dates as DD/MM/YYYY while digits are entered, inserting `/` after DD and MM. */
export function formatIndianDateInput(raw: string, previous = ''): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const previousDigits = previous.replace(/\D/g, '');
  const deleting = digits.length < previousDigits.length || raw.length < previous.length;
  if (!digits) return '';
  const day = digits.slice(0, 2);
  if (digits.length < 2) return day;
  if (digits.length === 2) return deleting ? day : `${day}/`;
  const month = digits.slice(2, 4);
  if (digits.length < 4) return `${day}/${month}`;
  if (digits.length === 4) return deleting ? `${day}/${month}` : `${day}/${month}/`;
  return `${day}/${month}/${digits.slice(4, 8)}`;
}

/** Parse DD/MM/YYYY to YYYY-MM-DD, or null if the calendar date is invalid. */
export function parseIndianDateToIso(value: string): string | null {
  const match = value.trim().match(INDIAN_DATE_RE);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return todayLocalDateString(date);
}

/** Keep typed or pasted dates inside today … today+90 days. */
export function clampProjectStartDateInput(value: string, now: Date = new Date()): string {
  const date = value.trim();
  if (!date) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return value;
  const min = todayLocalDateString(now);
  const max = maxProjectStartDateString(now);
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

export function formatProjectStartTime(
  type: ProjectStartTimeType,
  specificDate?: string | null,
): string {
  switch (type) {
    case '1week':
      return 'Within 1 week';
    case '2week':
      return 'Within 2 weeks';
    case '1month':
      return 'Within 1 month';
    case 'specific':
      return isoToIndianDate(specificDate) || specificDate || 'Specific Date';
    default:
      return '—';
  }
}

export function validateProjectStartTime(input: {
  projectStartTimeType: ProjectStartTimeType | null;
  projectStartTimeSpecificDate: string;
}): { error: string } | { type: ProjectStartTimeType; specificDate: string | null } {
  if (!input.projectStartTimeType || !isProjectStartTimeType(input.projectStartTimeType)) {
    return { error: 'Select when the project should start.' };
  }
  if (input.projectStartTimeType === 'specific') {
    const date = input.projectStartTimeSpecificDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: 'Select a specific project start date.' };
    }
    if (!isProjectStartDateWithinRange(date)) {
      return {
        error:
          getProjectStartDateFieldError(date) ?? PROJECT_START_DATE_RANGE_INVALID_MESSAGE,
      };
    }
    return { type: 'specific', specificDate: date };
  }
  return { type: input.projectStartTimeType, specificDate: null };
}

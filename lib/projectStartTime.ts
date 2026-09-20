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
  'Error: Projects starting beyond 3 months (90 days) cannot be created.';
export const PROJECT_START_DATE_WITHIN_MONTH_NOTE =
  'Note: Projects can be scheduled up to 3 months (90 days) in advance from today.';
export const PROJECT_START_DATE_BEYOND_MONTH_NOTE =
  'Note: For projects scheduled beyond 1 month, a small token booking amount will be required upon offline site verification and contract agreement to confirm contractor availability.';
/** @deprecated Use PROJECT_START_DATE_WITHIN_MONTH_NOTE */
export const PROJECT_START_DATE_BOOKING_NOTE = PROJECT_START_DATE_WITHIN_MONTH_NOTE;

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

/** Real-time field error for a typed or picked start date. */
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

export function getProjectStartBookingNote(
  type: string | null | undefined,
  specificDate?: string | null,
): string {
  if (type === 'specific' && isProjectStartDateBeyondOneMonth(specificDate ?? '')) {
    return PROJECT_START_DATE_BEYOND_MONTH_NOTE;
  }
  return PROJECT_START_DATE_WITHIN_MONTH_NOTE;
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
      return specificDate || 'Specific Date';
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

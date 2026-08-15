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
    return { type: 'specific', specificDate: date };
  }
  return { type: input.projectStartTimeType, specificDate: null };
}

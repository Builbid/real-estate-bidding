import type { ServiceType } from '@/lib/types';

export type ProjectServiceFilter = 'all' | ServiceType;

export const PROJECT_SERVICE_FILTER_OPTIONS: { id: ProjectServiceFilter; label: string }[] = [
  { id: 'all', label: 'All Projects' },
  { id: 'labour_contractor', label: 'Mistri Worker' },
  { id: 'drawing_design', label: 'Drawing and Design' },
  { id: 'painter', label: 'Painter' },
  { id: 'plumber', label: 'Plumber' },
  { id: 'electrician', label: 'Electrician' },
  { id: 'earthwork', label: 'Earthwork' },
];

export const PROJECT_SERVICE_FILTER_PILL_ACTIVE =
  'bg-brand text-white font-medium rounded-full px-4 py-1.5 text-sm';

export const PROJECT_SERVICE_FILTER_PILL_INACTIVE =
  'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 font-medium rounded-full px-4 py-1.5 text-sm';

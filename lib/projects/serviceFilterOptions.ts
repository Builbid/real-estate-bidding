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
  'border border-brand bg-brand text-white font-medium rounded-full px-4 py-1.5 text-sm';

export const PROJECT_SERVICE_FILTER_PILL_INACTIVE =
  'border border-gray-200 bg-white text-slate-800 hover:bg-gray-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800/40 font-medium rounded-full px-4 py-1.5 text-sm';

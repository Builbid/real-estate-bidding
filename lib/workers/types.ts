import type { ServiceType } from '@/lib/types';

/** Filter keys for the workers directory (excludes construction firms). */
export type WorkerCategory =
  | 'all'
  | 'labour_contractor'
  | 'plumber'
  | 'electrician'
  | 'false_ceiling_work'
  | 'painter'
  | 'earthwork'
  | 'drawing_design';

export interface RankedWorker {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewsCount: number;
  category: Exclude<WorkerCategory, 'all'>;
  categoryLabel: string;
  avatarUrl: string;
  portfolioLink: string;
  isVerified?: boolean;
}

export const WORKER_CATEGORY_FILTERS: Array<{
  value: WorkerCategory;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'labour_contractor', label: 'Mistri Worker' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'false_ceiling_work', label: 'Interior Designer' },
  { value: 'painter', label: 'Painter' },
  { value: 'earthwork', label: 'Earthwork' },
  { value: 'drawing_design', label: 'Drawing & Design' },
];

export function isWorkerCategory(value: string): value is Exclude<WorkerCategory, 'all'> {
  return WORKER_CATEGORY_FILTERS.some((f) => f.value === value && f.value !== 'all');
}

export function categoryLabel(category: Exclude<WorkerCategory, 'all'>): string {
  return WORKER_CATEGORY_FILTERS.find((f) => f.value === category)?.label ?? 'Worker';
}

/** Map a DB service_type / specialty string onto a worker category. */
export function resolveWorkerCategory(
  serviceType: ServiceType | string | null | undefined,
  role?: string | null,
): Exclude<WorkerCategory, 'all'> {
  if (serviceType && isWorkerCategory(serviceType)) return serviceType;
  if (role === 'labour_contractor') return 'labour_contractor';
  if (role === 'service_provider') return 'plumber';
  return 'labour_contractor';
}

/** Sort highest rating first; break ties with more reviews. */
export function sortWorkersByRank(workers: RankedWorker[]): RankedWorker[] {
  return [...workers].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.reviewsCount - a.reviewsCount;
  });
}

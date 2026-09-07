import type { ServiceType } from '@/lib/types';
import { isLegacyInteriorWorkService } from '@/lib/trades';

/** Filter keys for the workers directory (excludes construction firms). */
export type WorkerCategory =
  | 'all'
  | 'labour_contractor'
  | 'plumber'
  | 'electrician'
  | 'painter'
  | 'earthwork'
  | 'drawing_design'
  /** @deprecated Interior Work removed — kept only for legacy ranked rows. */
  | 'false_ceiling_work';

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
  { value: 'painter', label: 'Painter' },
  { value: 'earthwork', label: 'Earthwork' },
  { value: 'drawing_design', label: 'Drawing & Design' },
];

export function isWorkerCategory(value: string): value is Exclude<WorkerCategory, 'all'> {
  return WORKER_CATEGORY_FILTERS.some((f) => f.value === value && f.value !== 'all');
}

export function categoryLabel(category: Exclude<WorkerCategory, 'all'>): string {
  if (category === 'false_ceiling_work') return 'Interior Work';
  return WORKER_CATEGORY_FILTERS.find((f) => f.value === category)?.label ?? 'Worker';
}

/** Map a DB service_type / specialty string onto a worker category. */
export function resolveWorkerCategory(
  serviceType: ServiceType | string | null | undefined,
  role?: string | null,
): Exclude<WorkerCategory, 'all'> {
  if (isLegacyInteriorWorkService(serviceType)) return 'false_ceiling_work';
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

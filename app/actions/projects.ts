'use server';

import {
  fetchActiveProjectsPage,
  type ActiveProjectsPageResult,
} from '@/lib/projects/fetchActiveProjectsPage';

export async function loadActiveProjectsPage(input: {
  offset: number;
  search?: string;
  limit?: number;
}): Promise<ActiveProjectsPageResult> {
  return fetchActiveProjectsPage({
    offset: input.offset,
    limit: input.limit,
    search: input.search,
    expireStale: true,
  });
}

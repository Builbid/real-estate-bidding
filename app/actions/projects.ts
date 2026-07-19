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
    search: input.search,
    expireStale: true,
  });
}

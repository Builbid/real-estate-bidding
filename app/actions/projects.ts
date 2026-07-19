'use server';

import {
  fetchActiveProjectsPage,
  PROJECTS_PAGE_SIZE,
  type ActiveProjectsPageResult,
} from '@/lib/projects/fetchActiveProjectsPage';

export async function loadActiveProjectsPage(input: {
  offset: number;
  search?: string;
  limit?: number;
}): Promise<ActiveProjectsPageResult> {
  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset)) : 0;
  const limit = input.limit ?? PROJECTS_PAGE_SIZE;

  return fetchActiveProjectsPage({
    offset,
    limit,
    search: input.search,
    expireStale: offset === 0,
  });
}

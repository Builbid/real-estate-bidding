export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { getDashboardPath, isBidderRole, normalizeRole } from '@/lib/auth/roles';
import { CompletedProjectsHistory } from '@/components/dashboard/CompletedProjectsHistory';
import {
  COMPLETED_HISTORY_PAGE_SIZE,
  parseHistoryPage,
} from '@/lib/dashboard/completedProjects';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] };

export default async function WorkerCompletedProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parseHistoryPage(pageParam);
  const { supabase, userId, role } = await getAuthUser();
  const normalized = normalizeRole(role);
  if (!isBidderRole(normalized)) redirect('/dashboard');

  const from = (page - 1) * COMPLETED_HISTORY_PAGE_SIZE;
  const to = from + COMPLETED_HISTORY_PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from('projects')
    .select('*, bids(count)', { count: 'exact' })
    .eq('selected_builder_id', userId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .range(from, to);

  const projects = (data ?? []) as ProjectWithBidCount[];
  const totalCount = count ?? projects.length;

  return (
    <CompletedProjectsHistory
      title="Completed Project History"
      backHref={getDashboardPath(normalized)}
      backLabel="Back to Worker Dashboard"
      projects={projects}
      totalCount={totalCount}
      page={page}
      basePath="/dashboard/worker/projects/completed"
      viewHrefFor={(project) => `/project/${project.id}`}
    />
  );
}

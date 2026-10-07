export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { getDashboardPath, isBidderRole, normalizeRole } from '@/lib/auth/roles';
import { CompletedProjectsHistory } from '@/components/dashboard/CompletedProjectsHistory';
import {
  COMPLETED_HISTORY_PAGE_SIZE,
  completedAgreementOrFilter,
  isAgreementComplete,
  parseHistoryPage,
} from '@/lib/dashboard/completedProjects';
import { sortByCreatedAtDesc } from '@/lib/utils';
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

  const signed = await supabase
    .from('projects')
    .select('*, bids(count)', { count: 'exact' })
    .eq('selected_builder_id', userId)
    .or(completedAgreementOrFilter())
    .order('created_at', { ascending: false })
    .range(from, to);

  const result = signed.error
    ? await supabase
        .from('projects')
        .select('*, bids(count)', { count: 'exact' })
        .eq('selected_builder_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(from, to)
    : signed;

  const projects = sortByCreatedAtDesc(
    ((result.data ?? []) as ProjectWithBidCount[]).filter(isAgreementComplete),
  );
  const count = result.count;
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

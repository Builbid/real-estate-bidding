export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { CompletedProjectsHistory } from '@/components/dashboard/CompletedProjectsHistory';
import {
  COMPLETED_HISTORY_PAGE_SIZE,
  parseHistoryPage,
} from '@/lib/dashboard/completedProjects';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] };

export default async function OwnerCompletedProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parseHistoryPage(pageParam);
  const { supabase, userId } = await getAuthUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (profile?.role !== 'owner') redirect('/dashboard');

  const from = (page - 1) * COMPLETED_HISTORY_PAGE_SIZE;
  const to = from + COMPLETED_HISTORY_PAGE_SIZE - 1;

  const columns = '*, bids(count)';
  const broad = await supabase
    .from('projects')
    .select(columns, { count: 'exact' })
    .eq('owner_id', userId)
    .neq('status', 'cancelled')
    .or('status.eq.completed,agreement_completed.eq.true,agreement_status.eq.approved_active')
    .order('updated_at', { ascending: false })
    .range(from, to);

  const result = broad.error
    ? await supabase
        .from('projects')
        .select(columns, { count: 'exact' })
        .eq('owner_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .range(from, to)
    : broad;

  const projects = (result.data ?? []) as ProjectWithBidCount[];
  const totalCount = result.count ?? projects.length;

  return (
    <CompletedProjectsHistory
      title="Completed Project History"
      backHref="/dashboard/owner"
      backLabel="Back to Owner Dashboard"
      projects={projects}
      totalCount={totalCount}
      page={page}
      basePath="/dashboard/owner/projects/completed"
      viewHrefFor={(project) => `/dashboard/owner/project/${project.id}`}
      showDelete
    />
  );
}

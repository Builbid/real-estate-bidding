export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/getUser';
import { getDashboardPath } from '@/lib/auth/roles';
import {
  DASHBOARD_COMPLETED_LIMIT,
  isOwnerSelectedProject,
} from '@/lib/dashboard/completedProjects';
import { SelectedProjectCard, type SelectedWorkerProfile } from '@/components/dashboard/SelectedProjectCard';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn, sortByTimestampDesc } from '@/lib/utils';
import type { Project } from '@/lib/types';

function selectedStamp(project: Project): string {
  return project.builder_selected_at || project.updated_at || project.created_at;
}

export default async function OwnerSelectedProjectsPage() {
  const { supabase, userId, role } = await getAuthUser();
  if (role !== 'owner') redirect(getDashboardPath(role));

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load selected projects: ${error.message}`);
  }

  const selected = sortByTimestampDesc(
    ((data ?? []) as Project[]).filter(
      (project) => project.status !== 'expired' && isOwnerSelectedProject(project),
    ),
    selectedStamp,
  );
  const visible = selected.slice(0, DASHBOARD_COMPLETED_LIMIT);
  const workerIds = [...new Set(visible.map((project) => project.selected_builder_id).filter(Boolean))] as string[];

  const workers = new Map<string, SelectedWorkerProfile>();
  if (workerIds.length > 0) {
    const withCompany = await supabase
      .from('profiles_public')
      .select('id, full_name, company_name, is_verified')
      .in('id', workerIds);
    const profiles = withCompany.error
      ? await supabase.from('profiles_public').select('id, full_name, is_verified').in('id', workerIds)
      : withCompany;
    for (const row of (profiles.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      company_name?: string | null;
      is_verified?: boolean | null;
    }>) {
      workers.set(row.id, {
        id: row.id,
        name: row.company_name?.trim() || row.full_name?.trim() || 'Worker',
        isVerified: Boolean(row.is_verified),
      });
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <Link href="/dashboard/owner" className={cn(NAV_BACK_LINK, 'mb-3')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Selected Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selected.length === 0
            ? 'Projects appear here as soon as you select a worker.'
            : selected.length > visible.length
              ? `Showing the ${visible.length} most recent of ${selected.length} selected projects.`
              : `${visible.length} selected project${visible.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((project) => (
            <SelectedProjectCard
              key={project.id}
              project={project}
              worker={project.selected_builder_id ? workers.get(project.selected_builder_id) ?? null : null}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

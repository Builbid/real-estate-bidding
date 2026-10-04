import { CompletedProjectRow } from '@/components/dashboard/CompletedProjectRow';
import { CompletedProjectsFolder } from '@/components/dashboard/CompletedProjectsFolder';
import { DASHBOARD_COMPLETED_LIMIT } from '@/lib/dashboard/completedProjects';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] };

/**
 * Collapsible "Completed projects" accordion. Closed by default; the header row toggles it.
 * Only the most recent DASHBOARD_COMPLETED_LIMIT (10) projects are ever rendered and there is
 * no "view all" link to older history.
 */
export function CompletedProjectsPreview({
  projects,
  viewHrefFor,
  showDelete = false,
}: {
  projects: ProjectWithBidCount[];
  viewHrefFor: (project: ProjectWithBidCount) => string;
  showDelete?: boolean;
}) {
  const visible = projects.slice(0, DASHBOARD_COMPLETED_LIMIT);
  if (visible.length === 0) return null;

  return (
    <CompletedProjectsFolder count={visible.length}>
      <div className="divide-y divide-border/70">
        {visible.map((project) => (
          <CompletedProjectRow
            key={project.id}
            project={project}
            bidCount={project.bids?.[0]?.count ?? 0}
            viewHref={viewHrefFor(project)}
            showDelete={showDelete}
          />
        ))}
      </div>
    </CompletedProjectsFolder>
  );
}

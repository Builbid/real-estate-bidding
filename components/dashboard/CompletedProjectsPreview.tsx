import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CompletedProjectRow } from '@/components/dashboard/CompletedProjectRow';
import { DASHBOARD_COMPLETED_LIMIT } from '@/lib/dashboard/completedProjects';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] };

export function CompletedProjectsPreview({
  projects,
  totalCount,
  viewAllHref,
  viewHrefFor,
  showDelete = false,
}: {
  projects: ProjectWithBidCount[];
  totalCount: number;
  viewAllHref: string;
  viewHrefFor: (project: ProjectWithBidCount) => string;
  showDelete?: boolean;
}) {
  if (totalCount === 0) return null;

  const preview = projects.slice(0, DASHBOARD_COMPLETED_LIMIT);

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-muted-foreground">Completed Projects</h2>
      <div className="space-y-3">
        {preview.map((project) => (
          <CompletedProjectRow
            key={project.id}
            project={project}
            bidCount={project.bids?.[0]?.count ?? 0}
            viewHref={viewHrefFor(project)}
            showDelete={showDelete}
          />
        ))}
      </div>
      {totalCount > DASHBOARD_COMPLETED_LIMIT ? (
        <div className="mt-4 flex justify-center">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            View All Completed Projects
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

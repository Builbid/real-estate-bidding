import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CompletedProjectRow } from '@/components/dashboard/CompletedProjectRow';
import { CompletedProjectsFolder } from '@/components/dashboard/CompletedProjectsFolder';
import { DashboardWorkSection } from '@/components/dashboard/DashboardWorkSection';
import { DASHBOARD_COMPLETED_LIMIT } from '@/lib/dashboard/completedProjects';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] };

export function CompletedProjectsPreview({
  projects,
  totalCount,
  viewAllHref,
  viewHrefFor,
  showDelete = false,
  variant = 'preview',
}: {
  projects: ProjectWithBidCount[];
  totalCount: number;
  viewAllHref: string;
  viewHrefFor: (project: ProjectWithBidCount) => string;
  showDelete?: boolean;
  variant?: 'preview' | 'folder';
}) {
  if (totalCount === 0) return null;

  const preview = projects.slice(0, DASHBOARD_COMPLETED_LIMIT);
  const list = (
    <>
      <div className="divide-y divide-border/70">
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
      {totalCount > DASHBOARD_COMPLETED_LIMIT || variant === 'folder' ? (
        <div className="mt-3 flex justify-center border-t border-border/70 pt-3">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover hover:underline"
          >
            View all completed projects
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </>
  );

  if (variant === 'folder') {
    return <CompletedProjectsFolder count={totalCount}>{list}</CompletedProjectsFolder>;
  }

  return (
    <DashboardWorkSection
      tone="done"
      title="Completed projects"
      count={totalCount}
      description="Awarded jobs. Closed — not part of live bidding."
    >
      {list}
    </DashboardWorkSection>
  );
}

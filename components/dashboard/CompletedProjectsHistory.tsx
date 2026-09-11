import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CompletedProjectRow } from '@/components/dashboard/CompletedProjectRow';
import { NavLink } from '@/components/shared/NavLink';
import { Button } from '@/components/ui/button';
import { COMPLETED_HISTORY_PAGE_SIZE } from '@/lib/dashboard/completedProjects';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] };

export function CompletedProjectsHistory({
  title,
  backHref,
  backLabel,
  projects,
  totalCount,
  page,
  basePath,
  viewHrefFor,
  showDelete = false,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  projects: ProjectWithBidCount[];
  totalCount: number;
  page: number;
  basePath: string;
  viewHrefFor: (project: ProjectWithBidCount) => string;
  showDelete?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / COMPLETED_HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <NavLink href={backHref} prefetch className={cn(NAV_BACK_LINK, 'mb-3')}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </NavLink>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount === 0
            ? 'No completed projects yet.'
            : `${totalCount} completed project${totalCount === 1 ? '' : 's'}`}
        </p>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <CompletedProjectRow
              key={project.id}
              project={project}
              bidCount={project.bids?.[0]?.count ?? 0}
              viewHref={viewHrefFor(project)}
              showDelete={showDelete}
              plainTags
            />
          ))}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          {safePage <= 1 ? (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={safePage <= 2 ? basePath : `${basePath}?page=${safePage - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Page {safePage} of {totalPages}
          </p>
          {safePage >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}?page=${safePage + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

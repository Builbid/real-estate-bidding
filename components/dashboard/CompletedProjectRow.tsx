import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { DeleteProjectButton } from '@/app/dashboard/owner/DeleteProjectButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloorScopeBadges } from '@/components/project/FloorScopeBadges';
import {
  getProjectConfigOrDrawingMeta,
  getProjectServiceBadgeLabel,
} from '@/lib/project/display';
import {
  formatFloorSummary,
  getProjectBuildingTypeLabel,
  getProjectBuiltUpAreaLabel,
  getProjectLocationLabel,
} from '@/lib/project/formatFloorSummary';
import { STATUS_CONFIG } from '@/lib/utils';
import type { Project } from '@/lib/types';

type ProjectWithBidCount = Project & { bids?: [{ count: number }] | { count: number }[] };

export function CompletedProjectRow({
  project,
  bidCount,
  viewHref,
  showDelete = false,
  plainTags = true,
}: {
  project: ProjectWithBidCount;
  bidCount?: number;
  viewHref: string;
  showDelete?: boolean;
  plainTags?: boolean;
}) {
  const resolvedBidCount = bidCount ?? project.bids?.[0]?.count ?? 0;
  const serviceBadge = getProjectServiceBadgeLabel(project);
  const locationLabel = getProjectLocationLabel(project);
  const buildingTypeLabel = getProjectBuildingTypeLabel(project);
  const builtUpLabel = getProjectBuiltUpAreaLabel(project);
  const floorScopes = formatFloorSummary(project);
  const configFallback = floorScopes.length === 0 ? getProjectConfigOrDrawingMeta(project) : null;
  const statusLabel = STATUS_CONFIG[project.status].label;

  const metaParts = [
    locationLabel || null,
    buildingTypeLabel ?? configFallback,
    builtUpLabel,
    `${resolvedBidCount} bid${resolvedBidCount !== 1 ? 's' : ''}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/80 dark:bg-card/60 transition-colors hover:border-border">
      <div className="flex-1 min-w-0">
        {plainTags ? (
          <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            {statusLabel}
            <span className="text-gray-400"> · </span>
            {serviceBadge}
          </p>
        ) : (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="default">{statusLabel}</Badge>
            <Badge>{serviceBadge}</Badge>
          </div>
        )}
        <p className="truncate text-sm font-semibold text-foreground">{project.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {metaParts.map((part, index) => (
            <span key={`${part}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 ? (
                <span className="text-muted-foreground/60" aria-hidden>
                  •
                </span>
              ) : null}
              {index === metaParts.length - 1 ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {part}
                </span>
              ) : (
                <span>{part}</span>
              )}
            </span>
          ))}
        </div>
        {floorScopes.length > 0 ? (
          <FloorScopeBadges
            items={floorScopes}
            className="mt-2"
            variant={plainTags ? 'plain' : 'badge'}
          />
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {showDelete ? (
          <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href={viewHref}>
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

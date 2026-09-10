'use client';

import { cn } from '@/lib/utils';
import {
  PROJECT_SERVICE_FILTER_OPTIONS,
  PROJECT_SERVICE_FILTER_PILL_ACTIVE,
  PROJECT_SERVICE_FILTER_PILL_INACTIVE,
  type ProjectServiceFilter,
} from '@/lib/projects/serviceFilterOptions';

interface ProjectServiceFilterPillsProps {
  value: ProjectServiceFilter;
  onChange: (id: ProjectServiceFilter) => void;
}

export function ProjectServiceFilterPills({
  value,
  onChange,
}: ProjectServiceFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by service type">
      {PROJECT_SERVICE_FILTER_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'transition-colors',
            value === id
              ? PROJECT_SERVICE_FILTER_PILL_ACTIVE
              : PROJECT_SERVICE_FILTER_PILL_INACTIVE,
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

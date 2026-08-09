'use client';

import {
  formatBuildingTypesSummary,
  getSectionHeaderStyle,
  sortBuildingTypes,
  type BuildingType,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import { hasNewBuildingConfig } from '@/lib/buildingConfig';
import type { Project } from '@/lib/types';
import { ConstructionTypeInfoButton } from '@/components/construction/ConstructionTypeInfoButton';
import { ConstructionMatrixSummary } from '@/components/construction/ConstructionMatrixSummary';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BuildingConfigSummaryProps {
  project: Pick<
    Project,
    'building_types' | 'construction_types' | 'track_type' | 'sub_configuration'
  >;
  compact?: boolean;
  className?: string;
}

export function BuildingConfigSummary({
  project,
  compact = false,
  className,
}: BuildingConfigSummaryProps) {
  const buildingTypes = Array.isArray(project.building_types)
    ? project.building_types.filter((t): t is BuildingType => typeof t === 'string')
    : [];

  const safeProject = {
    ...project,
    building_types: buildingTypes,
    construction_types: (project.construction_types ?? {}) as ConstructionTypesMap,
    track_type: project.track_type ?? 'RCC',
    sub_configuration: project.sub_configuration ?? {},
  };

  if (!hasNewBuildingConfig(safeProject)) {
    return (
      <ConstructionMatrixSummary
        trackType={safeProject.track_type}
        subConfiguration={safeProject.sub_configuration}
        compact={compact}
        className={className}
      />
    );
  }

  const types = sortBuildingTypes(buildingTypes);
  const constructionTypes = safeProject.construction_types;

  if (compact) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <div className="flex flex-wrap gap-1 justify-end">
          {types.map((type) => (
            <Badge key={type} variant="default" className="text-[10px] font-medium">
              {type.replace('RCC ', '')}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          {types
            .map((t) => {
              const ct = constructionTypes[t];
              return ct ? `${t.replace('RCC ', '')}: ${ct}` : t;
            })
            .join(' · ')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {formatBuildingTypesSummary(types)}
      </p>
      {types.map((buildingType) => {
        const ct = constructionTypes[buildingType];
        if (!ct) return null;
        const { icon, className: styleClassName } = getSectionHeaderStyle(buildingType);
        return (
          <div
            key={buildingType}
            className="overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card/90 to-card/50 shadow-sm"
          >
            <div
              className={cn(
                'flex items-center gap-2.5 border-l-4 px-3.5 py-2.5',
                styleClassName,
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {icon}
              </span>
              <span className="text-sm font-bold tracking-tight">
                {buildingType}
              </span>
            </div>
            <div className="flex items-center gap-1.5 border-t border-border/50 px-3.5 py-2.5">
              <span className="text-sm text-foreground/90">{ct}</span>
              <ConstructionTypeInfoButton
                buildingType={buildingType}
                constructionType={ct}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

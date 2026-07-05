'use client';

import {
  formatBuildingTypesSummary,
  sortBuildingTypes,
  type BuildingType,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import { hasNewBuildingConfig } from '@/lib/buildingConfig';
import type { Project } from '@/lib/types';
import { BuildingSectionHeader } from '@/components/construction/BuildingSectionHeader';
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
  if (!hasNewBuildingConfig(project)) {
    return (
      <ConstructionMatrixSummary
        trackType={project.track_type}
        subConfiguration={project.sub_configuration}
        compact={compact}
        className={className}
      />
    );
  }

  const types = sortBuildingTypes(project.building_types ?? []);
  const constructionTypes = (project.construction_types ?? {}) as ConstructionTypesMap;

  if (compact) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <div className="flex flex-wrap gap-1">
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
    <div className={cn('space-y-4', className)}>
      <p className="text-xs text-muted-foreground">{formatBuildingTypesSummary(types)}</p>
      {types.map((buildingType) => {
        const ct = constructionTypes[buildingType];
        if (!ct) return null;
        return (
          <div key={buildingType} className="space-y-2">
            <BuildingSectionHeader buildingType={buildingType} className="text-sm py-2" />
            <div className="flex items-center gap-1 px-1 text-sm text-foreground">
              <span>{ct}</span>
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

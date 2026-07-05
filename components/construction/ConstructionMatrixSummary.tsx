'use client';

import { getProjectFloorStages, type FloorStage } from '@/lib/constructionMatrix';
import { useConstructionI18n } from '@/lib/hooks/useConstructionI18n';
import type { Project, TrackType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConstructionMatrixSummaryProps {
  trackType: TrackType;
  subConfiguration: Project['sub_configuration'];
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function ConstructionMatrixSummary({
  trackType,
  subConfiguration,
  compact = false,
  showTitle = true,
  className,
}: ConstructionMatrixSummaryProps) {
  const { formatMatrixSummary, floorLabel, floorDetailDescription, stageLabel, t } =
    useConstructionI18n();
  const floors = getProjectFloorStages(trackType, subConfiguration);

  if (floors.length === 0) {
    return <span className={className}>—</span>;
  }

  if (compact) {
    if (floors.length === 1) {
      const f = floors[0];
      return (
        <span className={className}>
          {floorLabel(f.floor).replace(' Floor', '')}:{' '}
          {stageLabel(f.stage, false)}
        </span>
      );
    }
    return <span className={className}>{formatMatrixSummary(floors)}</span>;
  }

  return (
    <div className={className}>
      {showTitle && (
        <h3 className="mb-3 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          {t('construction.projectDescription')}
        </h3>
      )}
      <ul className="space-y-3">
        {floors.map((f: FloorStage) => (
          <li
            key={f.floor}
            className="rounded-lg border border-border/60 bg-secondary/30 p-3.5"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{floorLabel(f.floor)}</span>
              <span className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                f.stage === 'full'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
              )}>
                {stageLabel(f.stage, false)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {floorDetailDescription(f.floor)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

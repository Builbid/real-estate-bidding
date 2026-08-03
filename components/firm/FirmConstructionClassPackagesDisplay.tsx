'use client';

import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import {
  CONSTRUCTION_CLASS_LEVELS,
  getConstructionClassLabel,
} from '@/lib/firm/constructionClass';
import type { FinishingLevel, FirmConstructionClassPackages } from '@/lib/types';
import { cn } from '@/lib/utils';

const ACCENT = {
  slate: {
    border: 'border-slate-500/40',
    bg: 'bg-slate-500/8',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  },
  blue: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/8',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  },
  amber: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/8',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  },
};

interface FirmConstructionClassPackagesDisplayProps {
  packages: FirmConstructionClassPackages;
  highlightLevel?: FinishingLevel | null;
  compact?: boolean;
}

export function FirmConstructionClassPackagesDisplay({
  packages,
  highlightLevel = null,
  compact = false,
}: FirmConstructionClassPackagesDisplayProps) {
  const visibleLevels = CONSTRUCTION_CLASS_LEVELS.filter((level) => packages[level]?.trim());

  if (visibleLevels.length === 0) return null;

  return (
    <div className="space-y-3">
      {!compact && (
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Construction Packages
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            What this firm includes in each class of construction
          </p>
        </div>
      )}

      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3')}>
        {visibleLevels.map((level) => {
          const cfg = FINISHING_LEVEL_CONFIG[level];
          const accent = ACCENT[cfg.accent];
          const highlighted = highlightLevel === level;

          return (
            <div
              key={level}
              className={cn(
                'rounded-xl border p-4',
                highlighted ? `${accent.border} ${accent.bg} ring-2 ring-emerald-500/20` : 'border-border bg-secondary/20',
              )}
            >
              <div className="flex items-start gap-2.5 mb-2">
                <span className="text-xl leading-none">{cfg.icon}</span>
                <div>
                  <span
                    className={cn(
                      'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      accent.badge,
                    )}
                  >
                    {getConstructionClassLabel(level)}
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-1">{cfg.title}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {packages[level]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

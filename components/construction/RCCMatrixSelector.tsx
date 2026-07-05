'use client';

import { CheckCircle2 } from 'lucide-react';
import { getMatrixTierGroups, type MatrixOption } from '@/lib/constructionMatrix';
import type { RCCConfig } from '@/lib/types';
import { FloorStageInfoButton } from '@/components/construction/FloorStageInfoButton';
import { useConstructionI18n } from '@/lib/hooks/useConstructionI18n';
import { cn } from '@/lib/utils';

interface RCCMatrixSelectorProps {
  value: RCCConfig | '';
  onChange: (value: RCCConfig) => void;
}

const TIER_HEADER_STYLE = {
  ground: {
    icon: '🏠',
    className:
      'bg-stone-800 dark:bg-stone-700 border-l-stone-500 dark:border-l-stone-400 text-stone-50 ring-1 ring-black/5 dark:ring-white/10',
  },
  g_plus_1: {
    icon: '🏢',
    className:
      'bg-slate-800 dark:bg-slate-700 border-l-blue-600 dark:border-l-blue-400 text-slate-50 ring-1 ring-black/5 dark:ring-white/10',
  },
  g_plus_2: {
    icon: '🏗️',
    className:
      'bg-teal-950 dark:bg-teal-900 border-l-teal-600 dark:border-l-teal-400 text-teal-50 ring-1 ring-black/5 dark:ring-white/10',
  },
} as const;

function MatrixTierHeader({ tier }: { tier: keyof typeof TIER_HEADER_STYLE }) {
  const { tierLabel } = useConstructionI18n();
  const { icon, className } = TIER_HEADER_STYLE[tier];

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2.5 rounded-xl border-l-4 px-5 py-2.5 shadow-sm',
        'text-sm sm:text-base font-bold tracking-wide',
        className,
      )}
      role="heading"
      aria-level={3}
    >
      <span className="text-lg sm:text-xl leading-none flex-shrink-0" aria-hidden>
        {icon}
      </span>
      <span>{tierLabel(tier)}</span>
    </div>
  );
}

export function RCCMatrixSelector({ value, onChange }: RCCMatrixSelectorProps) {
  const { t } = useConstructionI18n();
  const groups = getMatrixTierGroups();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t('construction.matrixHelper')}</p>
        <p className="text-xs text-muted-foreground/80">{t('construction.matrixHelperAs')}</p>
      </div>

      {groups.map((group, index) => (
        <div key={group.tier} className={cn(index > 0 && 'mt-6')}>
          <div className="mb-3">
            <MatrixTierHeader tier={group.tier} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.options.map((option) => (
              <MatrixOptionCard
                key={option.id}
                option={option}
                selected={value === option.id}
                onSelect={() => onChange(option.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatrixOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: MatrixOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { formatFloorStageLine, t } = useConstructionI18n();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all',
        selected
          ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
          : 'border-border bg-card/80 hover:border-emerald-500/30 hover:bg-accent/40',
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('construction.option', { n: option.optionNumber })}
        </span>
        {selected && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
      </div>

      <ul className="space-y-2">
        {option.floors.map((floorStage) => (
          <li key={floorStage.floor} className="flex items-center gap-1 min-w-0">
            <span className="text-sm text-foreground leading-snug flex-1 min-w-0">
              {formatFloorStageLine(floorStage.floor, floorStage.stage)}
            </span>
            <FloorStageInfoButton floor={floorStage.floor} stage={floorStage.stage} />
          </li>
        ))}
      </ul>
    </button>
  );
}

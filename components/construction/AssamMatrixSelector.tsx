'use client';

import { CheckCircle2 } from 'lucide-react';
import type { AssamConfig } from '@/lib/types';
import { FloorStageInfoButton } from '@/components/construction/FloorStageInfoButton';
import { useConstructionI18n } from '@/lib/hooks/useConstructionI18n';
import { cn } from '@/lib/utils';

interface AssamMatrixSelectorProps {
  value: AssamConfig | '';
  onChange: (value: AssamConfig) => void;
}

const ASSAM_OPTIONS: { value: AssamConfig; stage: 'structural' | 'full' }[] = [
  { value: 'frame_to_roof', stage: 'structural' },
  { value: 'full_finishing', stage: 'full' },
];

export function AssamMatrixSelector({ value, onChange }: AssamMatrixSelectorProps) {
  const { stageLabel, t } = useConstructionI18n();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t('construction.assamHelper')}</p>
        <p className="text-xs text-muted-foreground/80">{t('construction.assamHelperAs')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ASSAM_OPTIONS.map(({ value: optValue, stage }, index) => (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className={cn(
              'w-full text-left rounded-xl border-2 p-4 transition-all',
              value === optValue
                ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                : 'border-border bg-card/80 hover:border-emerald-500/30 hover:bg-accent/40',
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('construction.option', { n: index + 1 })}
              </span>
              {value === optValue && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{stageLabel(stage)}</span>
              <FloorStageInfoButton floor="ground" stage={stage} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

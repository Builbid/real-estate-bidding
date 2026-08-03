'use client';

import { CheckCircle2 } from 'lucide-react';
import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import { CONSTRUCTION_CLASS_LEVELS } from '@/lib/firm/constructionClass';
import type { FinishingLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

const ACCENT = {
  slate: {
    border: 'border-slate-500/60',
    bg: 'bg-slate-500/8',
    ring: 'ring-slate-500/20',
  },
  blue: {
    border: 'border-blue-500/60',
    bg: 'bg-blue-500/8',
    ring: 'ring-blue-500/20',
  },
  amber: {
    border: 'border-amber-500/60',
    bg: 'bg-amber-500/8',
    ring: 'ring-amber-500/20',
  },
};

interface FirmConstructionClassSelectorProps {
  value: FinishingLevel | null;
  onChange: (value: FinishingLevel) => void;
  name?: string;
}

export function FirmConstructionClassSelector({
  value,
  onChange,
  name = 'construction_class',
}: FirmConstructionClassSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Construction class your firm delivers *
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Select the quality tier you typically build to. Clients will see this on your firm profile
          when comparing bids.
        </p>
      </div>

      <input type="hidden" name={name} value={value ?? ''} />

      <div className="grid grid-cols-1 gap-3">
        {CONSTRUCTION_CLASS_LEVELS.map((level) => {
          const cfg = FINISHING_LEVEL_CONFIG[level];
          const accent = ACCENT[cfg.accent];
          const selected = value === level;

          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={cn(
                'relative text-left rounded-xl border-2 p-4 transition-all duration-200',
                selected && `${accent.border} ${accent.bg} shadow-md ring-2 ${accent.ring}`,
                !selected && 'border-border bg-secondary/30 hover:border-muted-foreground/30',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{cfg.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{cfg.classBadge} Construction</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{cfg.title}</p>
                    </div>
                    {selected && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />}
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {cfg.includes.slice(0, 4).map((item) => (
                      <li key={item} className="text-[10px] text-muted-foreground flex gap-1.5">
                        <span className="text-emerald-500 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-muted-foreground/80 italic">
                    Typical projects: {cfg.bestFor}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { CheckCircle2 } from 'lucide-react';
import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import type { FinishingLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

const LEVELS: FinishingLevel[] = ['basic', 'standard', 'premium'];

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

interface FinishingLevelSelectorProps {
  value: FinishingLevel | null;
  onChange: (value: FinishingLevel) => void;
}

export function FinishingLevelSelector({ value, onChange }: FinishingLevelSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">What level of finishing do you want?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This determines the quality of materials and work the firm will deliver
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {LEVELS.map((level) => {
          const cfg = FINISHING_LEVEL_CONFIG[level];
          const accent = ACCENT[cfg.accent];
          const selected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={cn(
                'relative text-left rounded-2xl border-2 p-4 transition-all duration-200',
                selected && `${accent.border} ${accent.bg} shadow-lg ring-2 ${accent.ring}`,
                !selected && 'border-border bg-secondary/30 hover:border-muted-foreground/30',
              )}
            >
              {cfg.popular && (
                <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  Most Popular
                </span>
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-2xl">{cfg.icon}</span>
                {selected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
              <h3 className="text-sm font-bold text-foreground">{cfg.title}</h3>
              <span className="inline-block mt-1 mb-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary border border-border">
                {cfg.classBadge}
              </span>
              <ul className="space-y-1 mb-3">
                {cfg.includes.map((item) => (
                  <li key={item} className="text-[10px] text-muted-foreground flex gap-1">
                    <span className="text-emerald-500">•</span>{item}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground/80 italic">Best for: {cfg.bestFor}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

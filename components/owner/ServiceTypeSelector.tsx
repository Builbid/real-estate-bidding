'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceType } from '@/lib/types';
import { ALL_SERVICE_CATEGORIES, TRADE_SERVICE_OPTIONS } from '@/lib/trades';
import { isConstructionFirmEnabled } from '@/lib/features';
import { cn } from '@/lib/utils';

type ConstructionOption = {
  type: 'labour_contractor' | 'construction_firm';
  emoji: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  badge: string;
  premiumTag?: string;
  accent: 'amber' | 'indigo';
};

const MISTRI_OPTION: ConstructionOption = {
  type: 'labour_contractor',
  emoji: '👷',
  title: 'Mistri Contractor',
  bullets: [
    'Hire skilled construction workers',
    'You purchase & manage all materials',
    'Lower cost — more control',
  ],
  badge: 'Without Material',
  accent: 'amber',
};

const FIRM_OPTION: ConstructionOption = {
  type: 'construction_firm',
  emoji: '🏢',
  title: 'Construction Firm',
  subtitle: 'Let the firm handle everything',
  bullets: [
    'Complete turnkey construction',
    'Firm supplies material + labour',
    'Stress-free — just pay and get your home',
  ],
  badge: 'With Material',
  premiumTag: 'Premium Service',
  accent: 'indigo',
};

interface ServiceTypeSelectorProps {
  value: ServiceType | null;
  onChange: (value: ServiceType) => void;
  onContinue: () => void;
}

export function ServiceTypeSelector({ value, onChange, onContinue }: ServiceTypeSelectorProps) {
  const selectedLabel =
    ALL_SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? 'selected service';
  // Firm card omitted entirely while CONSTRUCTION_FIRM_ENABLED is false
  const constructionOptions = isConstructionFirmEnabled()
    ? [MISTRI_OPTION, FIRM_OPTION]
    : [MISTRI_OPTION];

  return (
    <div className={cn('space-y-6', value && 'pb-24')}>
      <div>
        <h2 className="text-xl font-bold text-foreground">What are you looking for?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the type of construction service you need
        </p>
      </div>

      <div
        className={cn(
          'grid gap-4',
          constructionOptions.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {constructionOptions.map((opt) => {
          const selected = value === opt.type;
          const isFirm = opt.type === 'construction_firm';
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onChange(opt.type)}
              className={cn(
                'relative text-left rounded-2xl border-2 p-5 transition-all duration-200 transform',
                selected && 'scale-[1.02]',
                selected && opt.accent === 'amber' && 'border-amber-500/70 bg-amber-500/8 shadow-lg shadow-amber-500/15',
                selected && opt.accent === 'indigo' && 'border-indigo-500/70 bg-indigo-500/10 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/25',
                !selected && 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                isFirm && !selected && 'border-indigo-500/20 bg-indigo-500/[0.03]',
              )}
            >
              {opt.premiumTag && (
                <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-500/25 dark:text-violet-100 dark:border-violet-400/50">
                  {opt.premiumTag}
                </span>
              )}
              <span className="text-3xl block mb-3">{opt.emoji}</span>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-bold text-foreground">{opt.title}</h3>
                {selected && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              </div>
              {opt.subtitle && (
                <p className="text-xs text-muted-foreground mb-3">{opt.subtitle}</p>
              )}
              <ul className="space-y-1 mb-3">
                {opt.bullets.map((b) => (
                  <li key={b} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-emerald-500">•</span>{b}
                  </li>
                ))}
              </ul>
              <span className={cn(
                'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                isFirm
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-100 dark:border-indigo-400/50'
                  : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400/45',
              )}>
                {opt.badge}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Or get drawings & design
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={() => onChange('drawing_design')}
          className={cn(
            'relative w-full rounded-2xl border-2 p-4 text-left transition-all duration-200',
            value === 'drawing_design'
              ? 'border-sky-500/70 bg-sky-500/10 shadow-lg shadow-sky-500/15 scale-[1.01]'
              : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
          )}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">✏️</span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">Drawing and Design</h3>
                {value === 'drawing_design' && (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                2D/3D house plans, structural, electrical, plumbing layouts & front elevation
              </p>
            </div>
          </div>
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Or hire a trade professional
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TRADE_SERVICE_OPTIONS.map((trade) => {
            const selected = value === trade.value;
            return (
              <button
                key={trade.value}
                type="button"
                onClick={() => onChange(trade.value)}
                className={cn(
                  'relative text-left rounded-xl border-2 p-3.5 transition-all duration-200',
                  selected
                    ? 'border-emerald-500/70 bg-emerald-500/8 shadow-md shadow-emerald-500/15 scale-[1.02]'
                    : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xl leading-none">{trade.emoji}</span>
                  {selected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </div>
                <p className="text-xs font-bold text-foreground">{trade.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{trade.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {value && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.14)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl space-y-1.5">
            <p className="text-center text-[11px] text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{selectedLabel}</span>
            </p>
            <Button size="lg" className="w-full" onClick={onContinue}>
              Continue →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

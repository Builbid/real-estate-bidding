'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceType } from '@/lib/types';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    type: 'labour_contractor' as const,
    emoji: '👷',
    title: 'Labour Contractor',
    subtitle: 'I will supply building materials myself',
    bullets: [
      'Hire skilled construction workers',
      'You purchase & manage all materials',
      'Lower cost — more control',
    ],
    badge: 'Without Material',
    accent: 'amber',
  },
  {
    type: 'construction_firm' as const,
    emoji: '🏗️',
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
  },
];

interface ServiceTypeSelectorProps {
  value: ServiceType | null;
  onChange: (value: ServiceType) => void;
  onContinue: () => void;
}

export function ServiceTypeSelector({ value, onChange, onContinue }: ServiceTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">What are you looking for?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the type of construction service you need
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
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
                <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {opt.premiumTag}
                </span>
              )}
              <span className="text-3xl block mb-3">{opt.emoji}</span>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-bold text-foreground">{opt.title}</h3>
                {selected && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{opt.subtitle}</p>
              <ul className="space-y-1 mb-3">
                {opt.bullets.map((b) => (
                  <li key={b} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-emerald-500">•</span>{b}
                  </li>
                ))}
              </ul>
              <span className={cn(
                'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
                isFirm ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25',
              )}>
                {opt.badge}
              </span>
            </button>
          );
        })}
      </div>

      <Button size="lg" className="w-full" disabled={!value} onClick={onContinue}>
        Continue →
      </Button>
    </div>
  );
}

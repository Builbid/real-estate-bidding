'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceType } from '@/lib/types';
import { ALL_SERVICE_CATEGORIES, TRADE_SERVICE_OPTIONS } from '@/lib/trades';
import { isConstructionFirmEnabled } from '@/lib/features';
import { cn } from '@/lib/utils';

type CompactServiceOption = {
  value: ServiceType;
  emoji: string;
  title: string;
  subtitle: string;
};

const COMPACT_SERVICE_OPTIONS: CompactServiceOption[] = [
  {
    value: 'labour_contractor',
    emoji: '👷',
    title: 'Mistri Worker',
    subtitle: 'Hire skilled masonry & labor workers',
  },
  {
    value: 'construction_firm',
    emoji: '🏢',
    title: 'Construction Firm',
    subtitle: 'Complete turnkey construction',
  },
  {
    value: 'drawing_design',
    emoji: '✏️',
    title: 'Drawing and Design',
    subtitle: '2D/3D house plans & structural layouts',
  },
  ...TRADE_SERVICE_OPTIONS.map((trade) => ({
    value: trade.value,
    emoji: trade.emoji,
    title: trade.label,
    subtitle: trade.description,
  })),
];

function ServiceCard({
  option,
  selected,
  onSelect,
}: {
  option: CompactServiceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex h-full min-h-0 w-full cursor-pointer flex-col justify-between rounded-xl border-2 p-3.5 text-left transition-all duration-200',
        selected
          ? 'scale-[1.02] border-emerald-500/70 bg-emerald-500/8 shadow-md shadow-emerald-500/15'
          : 'border-border bg-secondary/30 hover:border-emerald-500/50',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xl leading-none">{option.emoji}</span>
        {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />}
      </div>
      <p className="text-xs font-bold text-foreground">{option.title}</p>
      <p className="mt-0.5 flex-1 text-[10px] leading-snug text-muted-foreground">
        {option.subtitle}
      </p>
    </button>
  );
}

interface ServiceTypeSelectorProps {
  value: ServiceType | null;
  onChange: (value: ServiceType) => void;
  onContinue: () => void;
}

export function ServiceTypeSelector({ value, onChange, onContinue }: ServiceTypeSelectorProps) {
  const selectedLabel =
    ALL_SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? 'selected service';
  const options = isConstructionFirmEnabled()
    ? COMPACT_SERVICE_OPTIONS
    : COMPACT_SERVICE_OPTIONS.filter((opt) => opt.value !== 'construction_firm');

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
          'grid w-full auto-rows-fr items-stretch justify-items-center gap-3',
          options.length >= 8
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7',
        )}
      >
        {options.map((option) => (
          <ServiceCard
            key={option.value}
            option={option}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>

      {value && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.14)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-6xl space-y-1.5">
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

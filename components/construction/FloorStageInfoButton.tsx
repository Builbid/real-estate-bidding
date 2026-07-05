'use client';

import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConstructionI18n } from '@/lib/hooks/useConstructionI18n';
import type { ConstructionStage, FloorKey } from '@/lib/constructionMatrix';
import { cn } from '@/lib/utils';

interface FloorStageInfoButtonProps {
  floor: FloorKey;
  stage: ConstructionStage;
  className?: string;
}

export function FloorStageInfoButton({ floor, stage, className }: FloorStageInfoButtonProps) {
  const { floorLabel, getIncludedSteps, t } = useConstructionI18n();
  const steps = getIncludedSteps(floor, stage);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t('construction.whatsIncluded')} — ${floorLabel(floor)}`}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="text-xs">
        <p className="font-semibold text-foreground mb-2">{t('construction.whatsIncluded')}</p>
        <ul className="space-y-1">
          {steps.map((step) => (
            <li
              key={step.label}
              className={cn(step.included ? 'text-foreground' : 'text-muted-foreground')}
            >
              {step.included ? '✅' : '❌'} {step.label}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

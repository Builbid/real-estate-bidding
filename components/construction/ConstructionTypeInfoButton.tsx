'use client';

import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getIncludedSteps,
  type BuildingType,
  type ConstructionTypeValue,
} from '@/lib/buildingConfig';
import { cn } from '@/lib/utils';

interface ConstructionTypeInfoButtonProps {
  buildingType: BuildingType;
  constructionType: ConstructionTypeValue;
  className?: string;
}

export function ConstructionTypeInfoButton({
  buildingType,
  constructionType,
  className,
}: ConstructionTypeInfoButtonProps) {
  const steps = getIncludedSteps(buildingType, constructionType);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What's included for ${buildingType}`}
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
      <PopoverContent side="top" align="start" className="text-xs max-w-xs">
        <p className="font-semibold text-foreground mb-2">What&apos;s included?</p>
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

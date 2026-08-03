'use client';

import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import {
  CONSTRUCTION_CLASS_LEVELS,
  getConstructionClassLabel,
  getPackageDescriptionHint,
  MIN_PACKAGE_DESCRIPTION_LENGTH,
} from '@/lib/firm/constructionClass';
import type { FinishingLevel, FirmConstructionClassPackages } from '@/lib/types';
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

interface FirmConstructionClassPackagesFormProps {
  value: FirmConstructionClassPackages;
  onChange: (level: FinishingLevel, description: string) => void;
  errors?: Partial<Record<FinishingLevel, string | null>>;
  onBlur?: (level: FinishingLevel) => void;
}

export function FirmConstructionClassPackagesForm({
  value,
  onChange,
  errors = {},
  onBlur,
}: FirmConstructionClassPackagesFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Describe your Class A, B &amp; C construction packages *
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Clients choose one finishing level when posting a project. List what each package
          from your firm includes so they can compare your offerings.
        </p>
      </div>

      <div className="space-y-4">
        {CONSTRUCTION_CLASS_LEVELS.map((level) => {
          const cfg = FINISHING_LEVEL_CONFIG[level];
          const accent = ACCENT[cfg.accent];
          const fieldName = `construction_class_${level}`;
          const description = value[level] ?? '';
          const error = errors[level];
          const tooShort = description.length > 0 && description.length < MIN_PACKAGE_DESCRIPTION_LENGTH;

          return (
            <div
              key={level}
              className={cn(
                'rounded-xl border-2 p-4 transition-colors',
                error || tooShort ? 'border-red-500/50 bg-red-500/5' : `${accent.border} ${accent.bg}`,
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl leading-none">{cfg.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {getConstructionClassLabel(level)} Construction
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.title}</p>
                </div>
              </div>

              <label htmlFor={fieldName} className="sr-only">
                {getConstructionClassLabel(level)} package includes
              </label>
              <textarea
                id={fieldName}
                name={fieldName}
                rows={4}
                value={description}
                onChange={(e) => onChange(level, e.target.value)}
                onBlur={() => onBlur?.(level)}
                placeholder={getPackageDescriptionHint(level)}
                className={cn(
                  'flex w-full rounded-xl border border-input bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm',
                  'ring-offset-background transition-all duration-150 resize-y min-h-[96px]',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-emerald-500/70',
                  'dark:bg-card/60',
                  (error || tooShort) && 'border-red-500/70 focus:ring-red-500/40',
                )}
              />

              <p className="text-[10px] text-muted-foreground mt-2">
                Typical scope: {cfg.includes.slice(0, 3).join(' · ')}
              </p>

              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
              {!error && tooShort && (
                <p className="text-xs text-red-400 mt-1.5">
                  Add at least {MIN_PACKAGE_DESCRIPTION_LENGTH} characters.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { Languages, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { LOCALE_LABELS, type Locale } from '@/lib/i18n/types';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Locale; labelKey: 'language.english' | 'language.assamese'; badge: string }[] = [
  { value: 'en', labelKey: 'language.english', badge: 'EN' },
  { value: 'as', labelKey: 'language.assamese', badge: 'অসম' },
];

interface LanguageSwitcherProps {
  /** Styling when placed on the homepage hero / light header bar */
  overlay?: boolean;
  className?: string;
}

const triggerBase =
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors';

const triggerVariants = {
  default:
    'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent',
  overlay:
    'border-slate-300 bg-white/95 text-slate-800 hover:bg-white hover:border-slate-400',
} as const;

export function LanguageSwitcher({ overlay = false, className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();
  const active = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('language.label')}
          className={cn(
            triggerBase,
            overlay ? triggerVariants.overlay : triggerVariants.default,
            className,
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          <span>{active.badge}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('language.label')}
        </p>
        {OPTIONS.map(({ value, labelKey }) => {
          const selected = locale === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                selected
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-foreground/80 hover:bg-accent/60',
              )}
            >
              <span>
                {t(labelKey)}
                {value === 'en' && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({t('language.default')})
                  </span>
                )}
              </span>
              {selected && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

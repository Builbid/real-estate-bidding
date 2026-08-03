'use client';

import { ClipboardList, Gavel, Handshake } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageProvider';

const STEPS = [
  { key: 'post', icon: ClipboardList, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'bid', icon: Gavel, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  { key: 'select', icon: Handshake, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
] as const;

export function HowItWorksStrip() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-border/70 bg-muted/20 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {t('home.howItWorks.title')}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            {t('home.howItWorks.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map(({ key, icon: Icon, color, bg }, index) => (
            <div
              key={key}
              className="relative rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm"
            >
              <span className="absolute -top-2.5 left-5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {t(`home.howItWorks.${key}.title` as 'home.howItWorks.post.title')}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t(`home.howItWorks.${key}.desc` as 'home.howItWorks.post.desc')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

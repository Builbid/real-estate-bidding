'use client';

import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageProvider';

const REPEAT_COUNT = 4;

export function HomeMarqueeTicker() {
  const { t } = useTranslation();
  const text = t('home.hero.subtitle');

  return (
    <section
      aria-label={text}
      className="relative z-10 overflow-hidden border-t border-white/15 bg-gradient-to-r from-black/30 via-black/25 to-black/30 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black/40 to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/40 to-transparent sm:w-24" />

      <p className="hidden px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white/85 motion-reduce:block sm:py-3 sm:text-sm">
        {text}
      </p>

      <div className="flex py-2.5 sm:py-3 motion-reduce:hidden">
        <div className="flex min-w-full shrink-0 animate-marquee-ltr items-center gap-8 sm:gap-12">
          {Array.from({ length: REPEAT_COUNT }).map((_, index) => (
            <span
              key={index}
              className="inline-flex shrink-0 items-center gap-3 text-xs sm:text-sm font-medium tracking-wide text-white/85"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              {text}
            </span>
          ))}
        </div>
        <div
          className="flex min-w-full shrink-0 animate-marquee-ltr items-center gap-8 sm:gap-12"
          aria-hidden
        >
          {Array.from({ length: REPEAT_COUNT }).map((_, index) => (
            <span
              key={index}
              className="inline-flex shrink-0 items-center gap-3 text-xs sm:text-sm font-medium tracking-wide text-white/85"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              {text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

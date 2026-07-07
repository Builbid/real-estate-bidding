'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FeaturedFirmCard } from '@/components/home/FeaturedFirmCard';
import { DEMO_FIRMS } from '@/lib/data/demoFirms';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

export function FeaturedFirmsSection() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.75, 280);
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <section className="group relative border-b border-border bg-background py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 text-center sm:mb-8">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {t('home.featuredFirms.title')}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t('home.featuredFirms.subtitle')}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label={t('home.featuredFirms.scrollLeft')}
            className={cn(
              'absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 md:flex',
              'h-9 w-9 items-center justify-center rounded-full',
              'border border-border bg-card/95 text-foreground shadow-md backdrop-blur',
              'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
              'hover:border-violet-500/40 hover:bg-violet-500/10',
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label={t('home.featuredFirms.scrollRight')}
            className={cn(
              'absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 md:flex',
              'h-9 w-9 items-center justify-center rounded-full',
              'border border-border bg-card/95 text-foreground shadow-md backdrop-blur',
              'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
              'hover:border-violet-500/40 hover:bg-violet-500/10',
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className={cn(
              'flex gap-4 overflow-x-auto scroll-smooth px-0.5 pb-1',
              'snap-x snap-mandatory scrollbar-hide',
              'md:px-10',
            )}
          >
            {DEMO_FIRMS.map((firm) => (
              <FeaturedFirmCard
                key={firm.id}
                firm={firm}
                viewPortfolioLabel={t('home.featuredFirms.viewPortfolio')}
                reviewsLabel={t('home.featuredFirms.reviews', { count: firm.reviewCount })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

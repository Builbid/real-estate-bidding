'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FeaturedFirmCard } from '@/components/home/FeaturedFirmCard';
import type { DemoFirm, DemoPartnerType } from '@/lib/data/demoFirms';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

interface FeaturedPartnersCarouselProps {
  title: string;
  subtitle: string;
  firms: DemoFirm[];
  partnerType: DemoPartnerType;
  className?: string;
}

export function FeaturedPartnersCarousel({
  title,
  subtitle,
  firms,
  partnerType,
  className,
}: FeaturedPartnersCarouselProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.75, 280);
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  if (firms.length === 0) return null;

  return (
    <div className={cn('group relative', className)}>
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
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
            partnerType === 'labour_contractor'
              ? 'hover:border-amber-500/40 hover:bg-amber-500/10'
              : 'hover:border-violet-500/40 hover:bg-violet-500/10',
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
            partnerType === 'labour_contractor'
              ? 'hover:border-amber-500/40 hover:bg-amber-500/10'
              : 'hover:border-violet-500/40 hover:bg-violet-500/10',
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
          {firms.map((firm) => (
            <FeaturedFirmCard
              key={firm.id}
              firm={firm}
              partnerType={partnerType}
              viewPortfolioLabel={t('home.featuredFirms.viewPortfolio')}
              reviewsLabel={t('home.featuredFirms.reviews', { count: firm.reviewCount })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

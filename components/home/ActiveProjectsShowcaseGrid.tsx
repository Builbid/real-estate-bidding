'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { ShowcaseProjectCard } from './ShowcaseProjectCard';
import { Button } from '@/components/ui/button';
import {
  getShowcaseSectionLink,
  isProjectBiddingLive,
  sortShowcaseProjectsByLatest,
  type ShowcaseProject,
} from '@/lib/projectShowcase';
import { getProjectServiceType } from '@/lib/project/display';
import { getUniqueDistrictsFromProjects, matchesDistrictFilter } from '@/lib/project/districtFilter';
import type { ServiceType } from '@/lib/types';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { ProjectDistrictFilter, type DistrictFilterValue } from '@/components/shared/ProjectDistrictFilter';
import { cn } from '@/lib/utils';

type ServiceFilter = 'all' | ServiceType;

interface ActiveProjectsShowcaseGridProps {
  projects: ShowcaseProject[];
  isAuthenticated: boolean;
  role: string | null;
  heroOverlay?: boolean;
}

const FILTER_OPTIONS: { id: ServiceFilter; label: string }[] = [
  { id: 'all', label: 'All Projects' },
  { id: 'labour_contractor', label: 'Labour Contractor' },
  { id: 'construction_firm', label: 'Construction Firm' },
];

/** Once per full page load — avoids replaying the swipe hint on re-renders. */
let auctionSwipeHintPlayed = false;

function shouldPlaySwipeHint(): boolean {
  if (auctionSwipeHintPlayed) return false;
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  auctionSwipeHintPlayed = true;
  return true;
}

export function ActiveProjectsShowcaseGrid({
  projects: initialProjects,
  isAuthenticated,
  role,
  heroOverlay = false,
}: ActiveProjectsShowcaseGridProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRafRef = useRef<number | null>(null);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(() => new Set());
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [districtFilter, setDistrictFilter] = useState<DistrictFilterValue>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [playSwipeHint] = useState(shouldPlaySwipeHint);

  const handleExpire = useCallback((projectId: string) => {
    setExpiredIds((prev) => {
      if (prev.has(projectId)) return prev;
      const next = new Set(prev);
      next.add(projectId);
      return next;
    });
  }, []);

  const liveProjects = useMemo(
    () =>
      sortShowcaseProjectsByLatest(
        initialProjects.filter(
          (project) => isProjectBiddingLive(project) && !expiredIds.has(project.id),
        ),
      ),
    [initialProjects, expiredIds],
  );

  const availableDistricts = useMemo(
    () => getUniqueDistrictsFromProjects(liveProjects),
    [liveProjects],
  );

  const filteredProjects = useMemo(() => {
    const filtered = liveProjects.filter((project) => {
      const matchesService =
        serviceFilter === 'all' || getProjectServiceType(project) === serviceFilter;
      const matchesDistrict = matchesDistrictFilter(project.district, districtFilter);
      return matchesService && matchesDistrict;
    });
    return sortShowcaseProjectsByLatest(filtered);
  }, [liveProjects, serviceFilter, districtFilter]);

  const sectionLink = getShowcaseSectionLink(isAuthenticated, role);
  const hasMultipleCards = filteredProjects.length > 1;

  const updateActiveIndex = useCallback(() => {
    const track = scrollRef.current;
    if (!track) return;

    const trackLeft = track.getBoundingClientRect().left;
    let closest = 0;
    let minDistance = Infinity;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closest = index;
      }
    });

    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    cardRefs.current.length = filteredProjects.length;
  }, [filteredProjects]);

  useEffect(() => {
    const track = scrollRef.current;
    if (!track || filteredProjects.length === 0) return;

    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        updateActiveIndex();
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    updateActiveIndex();

    return () => {
      track.removeEventListener('scroll', onScroll);
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [filteredProjects, updateActiveIndex]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
    setActiveIndex(0);
  }, [serviceFilter, districtFilter]);

  useEffect(() => {
    setActiveIndex((prev) =>
      filteredProjects.length === 0 ? 0 : Math.min(prev, filteredProjects.length - 1),
    );
  }, [filteredProjects.length]);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.82, 280);
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <div className="group/carousel relative">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className={cn('text-xl font-bold', heroOverlay ? 'text-white' : 'text-foreground')}>
              {t('home.auctions.liveTitle')}
            </h2>
            {filteredProjects.length > 0 && (
              <span className={cn(
                'rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
                heroOverlay
                  ? 'border-white/20 bg-white/10 text-white/80'
                  : 'border-border bg-secondary/60 text-muted-foreground',
              )}>
                {activeIndex + 1} / {filteredProjects.length}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              {t('home.auctions.open', { count: filteredProjects.length })}
            </span>
          </div>
          {hasMultipleCards && (
            <p className={cn('mt-1.5 flex items-center gap-1 text-xs', heroOverlay ? 'text-white/70' : 'text-muted-foreground')}>
              {t('home.auctions.swipeHint')}
              <ArrowRight className="h-3 w-3 animate-swipe-arrow-nudge" aria-hidden />
            </p>
          )}
        </div>
        <Link
          href={sectionLink.href}
          className={cn(
            'text-sm transition-colors flex items-center gap-1 shrink-0',
            heroOverlay ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(sectionLink.labelKey)}{' '}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FILTER_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setServiceFilter(id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm',
              serviceFilter === id
                ? heroOverlay
                  ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100 shadow-emerald-500/10'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-emerald-500/10'
                : heroOverlay
                  ? 'bg-white/5 border-white/15 text-white/70 hover:text-white hover:border-white/25'
                  : 'bg-secondary/50 border-border/70 text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {label}
          </button>
        ))}
        {availableDistricts.length > 0 && (
          <ProjectDistrictFilter
            value={districtFilter}
            onChange={setDistrictFilter}
            districts={availableDistricts}
            heroOverlay={heroOverlay}
          />
        )}
      </div>

      {filteredProjects.length > 0 ? (
        <div>
          <div className="relative -mx-4 sm:-mx-6">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label={t('home.featuredFirms.scrollLeft')}
              className={cn(
                'absolute left-2 sm:left-4 top-1/2 z-10 hidden -translate-y-1/2 md:flex',
                'h-9 w-9 items-center justify-center rounded-full',
                'border border-border bg-card/95 text-foreground shadow-md backdrop-blur',
                'opacity-0 transition-opacity duration-200 group-hover/carousel:opacity-100',
                'hover:border-emerald-500/40 hover:bg-emerald-500/10',
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label={t('home.featuredFirms.scrollRight')}
              className={cn(
                'absolute right-2 sm:right-4 top-1/2 z-10 hidden -translate-y-1/2 md:flex',
                'h-9 w-9 items-center justify-center rounded-full',
                'border border-border bg-card/95 text-foreground shadow-md backdrop-blur',
                'opacity-0 transition-opacity duration-200 group-hover/carousel:opacity-100',
                'hover:border-emerald-500/40 hover:bg-emerald-500/10',
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {hasMultipleCards && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-y-0 right-0 z-[5] w-14 bg-gradient-to-l to-transparent',
                  heroOverlay ? 'from-slate-950/90' : 'from-background',
                )}
                aria-hidden
              />
            )}

            <div
              ref={scrollRef}
              className={cn(
                'flex gap-4 overflow-x-auto scroll-smooth px-4 sm:px-6 pb-1',
                'snap-x snap-mandatory scrollbar-hide',
                'md:px-12',
              )}
            >
              {filteredProjects.map((project, index) => (
                <div
                  key={project.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className={cn(
                    'flex-[0_0_82%] snap-start sm:flex-[0_0_82%]',
                    index === 0 && playSwipeHint && hasMultipleCards && 'animate-auction-swipe-hint',
                  )}
                >
                  <ShowcaseProjectCard
                    project={project}
                    role={role}
                    onExpire={handleExpire}
                  />
                </div>
              ))}
            </div>
          </div>

          {hasMultipleCards && (
            <div
              className="mt-4 flex items-center justify-center gap-1.5"
              role="tablist"
              aria-label={t('home.auctions.liveTitle')}
            >
              {filteredProjects.map((project, index) => (
                <span
                  key={project.id}
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Auction ${index + 1} of ${filteredProjects.length}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === activeIndex
                      ? 'w-6 bg-emerald-500'
                      : 'w-1.5 bg-muted-foreground/30',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Sparkles className="h-6 w-6 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('home.showcase.emptyTitle')}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{t('home.showcase.emptyDesc')}</p>
          {!isAuthenticated && (
            <Button asChild>
              <Link href="/register?role=owner">{t('home.hero.startPosting')}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

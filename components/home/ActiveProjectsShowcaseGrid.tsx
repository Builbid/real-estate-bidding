'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
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
import type { ServiceType } from '@/lib/types';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

type ServiceFilter = 'all' | ServiceType;

interface ActiveProjectsShowcaseGridProps {
  projects: ShowcaseProject[];
  isAuthenticated: boolean;
  role: string | null;
}

const FILTER_OPTIONS: { id: ServiceFilter; label: string }[] = [
  { id: 'all', label: 'All Projects' },
  { id: 'labour_contractor', label: 'Labour Contractor' },
  { id: 'construction_firm', label: 'Construction Firm' },
];

export function ActiveProjectsShowcaseGrid({
  projects: initialProjects,
  isAuthenticated,
  role,
}: ActiveProjectsShowcaseGridProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(() => new Set());
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');

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

  const filteredProjects = useMemo(() => {
    const filtered =
      serviceFilter === 'all'
        ? liveProjects
        : liveProjects.filter((p) => getProjectServiceType(p) === serviceFilter);
    return sortShowcaseProjectsByLatest(filtered);
  }, [liveProjects, serviceFilter]);

  const sectionLink = getShowcaseSectionLink(isAuthenticated, role);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 300);
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <div className="group/carousel relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-xl font-bold text-foreground">{t('home.auctions.liveTitle')}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            {t('home.auctions.open', { count: filteredProjects.length })}
          </span>
        </div>
        <Link
          href={sectionLink.href}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {t(sectionLink.labelKey)}{' '}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setServiceFilter(id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              serviceFilter === id
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredProjects.length > 0 ? (
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

          <div
            ref={scrollRef}
            className={cn(
              'flex gap-4 overflow-x-auto scroll-smooth px-4 sm:px-6 pb-1',
              'snap-x snap-mandatory scrollbar-hide',
              'md:px-12',
            )}
          >
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="w-[min(85vw,360px)] flex-shrink-0 snap-start"
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

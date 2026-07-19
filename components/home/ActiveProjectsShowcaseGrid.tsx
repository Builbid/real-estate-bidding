'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { ShowcaseProjectCard } from './ShowcaseProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  heroOverlay?: boolean;
}

const FILTER_OPTIONS: { id: ServiceFilter; label: string }[] = [
  { id: 'all', label: 'All Projects' },
  { id: 'labour_contractor', label: 'Labour Contractor' },
  { id: 'construction_firm', label: 'Construction Firm' },
];

function matchesLocationSearch(project: ShowcaseProject, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const city =
    typeof (project as ShowcaseProject & { city?: string | null }).city === 'string'
      ? (project as ShowcaseProject & { city?: string | null }).city
      : null;

  const fields = [project.title, city, project.district, project.state].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  return fields.some((field) => field.toLowerCase().includes(q));
}

export function ActiveProjectsShowcaseGrid({
  projects: initialProjects,
  isAuthenticated,
  role,
  heroOverlay = false,
}: ActiveProjectsShowcaseGridProps) {
  const { t } = useTranslation();
  const [expiredIds, setExpiredIds] = useState<Set<string>>(() => new Set());
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [locationSearch, setLocationSearch] = useState('');

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
    const filtered = liveProjects.filter((project) => {
      const matchesService =
        serviceFilter === 'all' || getProjectServiceType(project) === serviceFilter;
      return matchesService && matchesLocationSearch(project, locationSearch);
    });
    return sortShowcaseProjectsByLatest(filtered);
  }, [liveProjects, serviceFilter, locationSearch]);

  const sectionLink = getShowcaseSectionLink(isAuthenticated, role);
  const hasActiveSearch = locationSearch.trim().length > 0;

  return (
    <div className="relative">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className={cn('text-xl font-bold', heroOverlay ? 'text-white' : 'text-foreground')}>
              {t('home.auctions.liveTitle')}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-600/25 dark:border-emerald-500/20 font-semibold">
              {t('home.auctions.open', { count: filteredProjects.length })}
            </span>
          </div>
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
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
                  : 'bg-emerald-500/15 border-emerald-600/35 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300 shadow-emerald-500/10'
                : heroOverlay
                  ? 'bg-white/5 border-white/15 text-white/70 hover:text-white hover:border-white/25'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white hover:text-slate-900 dark:bg-secondary/50 dark:border-border/70 dark:text-muted-foreground dark:hover:text-foreground dark:hover:border-border',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 max-w-md">
        <Input
          type="search"
          value={locationSearch}
          onChange={(event) => setLocationSearch(event.target.value)}
          placeholder="Search by specific location"
          aria-label="Search by specific location"
          prefix={<Search className="h-4 w-4" />}
          className={cn(
            heroOverlay &&
              'border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:border-emerald-300/50 focus:ring-emerald-300/30',
          )}
        />
      </div>

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ShowcaseProjectCard
              key={project.id}
              project={project}
              role={role}
              onExpire={handleExpire}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Sparkles className="h-6 w-6 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {hasActiveSearch || serviceFilter !== 'all'
              ? 'No matching projects'
              : t('home.showcase.emptyTitle')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {hasActiveSearch || serviceFilter !== 'all'
              ? 'Try a different location, project name, or service filter.'
              : t('home.showcase.emptyDesc')}
          </p>
          {!isAuthenticated && !hasActiveSearch && serviceFilter === 'all' && (
            <Button asChild>
              <Link href="/register?role=owner">{t('home.hero.startPosting')}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

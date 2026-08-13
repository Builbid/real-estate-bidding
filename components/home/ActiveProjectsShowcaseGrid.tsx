'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { ShowcaseProjectCard } from './ShowcaseProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  isProjectBiddingLive,
  sortShowcaseProjectsByLatest,
  type ShowcaseProject,
} from '@/lib/projectShowcase';
import {
  getProjectServiceType,
  getServiceCategoryOption,
} from '@/lib/project/display';
import { isConstructionFirmEnabled } from '@/lib/features';
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
  { id: 'labour_contractor', label: 'Mistri Worker' },
  ...(isConstructionFirmEnabled()
    ? [{ id: 'construction_firm' as const, label: 'Construction Firm' }]
    : []),
];

/** Extra tokens so short searches like "mistri" / "firm" match the right category. */
const CATEGORY_SEARCH_ALIASES: Partial<Record<ServiceType, string[]>> = {
  labour_contractor: ['mistri', 'mistri worker', 'mistri contractor', 'labour', 'labor', 'labour contractor'],
  construction_firm: ['firm', 'construction firm', 'turnkey'],
  drawing_design: ['drawing', 'design', 'drawings', 'drawing and design'],
  painter: ['painter', 'paint', 'painting'],
  plumber: ['plumber', 'plumbing'],
  electrician: ['electrician', 'electric', 'electrical'],
  carpenter: ['carpenter', 'carpentry', 'woodwork'],
  false_ceiling_work: ['interior', 'interior work', 'false ceiling'],
  earthwork: ['earthwork', 'excavation'],
};

function matchesCategorySearch(serviceType: ServiceType, q: string): boolean {
  const category = getServiceCategoryOption(serviceType);
  const tokens = [
    category.label,
    category.value.replace(/_/g, ' '),
    ...(CATEGORY_SEARCH_ALIASES[serviceType] ?? []),
  ].map((t) => t.toLowerCase());

  return tokens.some((token) => token.includes(q) || q.includes(token));
}

function matchesProjectSearch(project: ShowcaseProject, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const city =
    typeof (project as ShowcaseProject & { city?: string | null }).city === 'string'
      ? (project as ShowcaseProject & { city?: string | null }).city
      : null;

  const fields = [project.title, city, project.district, project.state].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  if (fields.some((field) => field.toLowerCase().includes(q))) return true;

  return matchesCategorySearch(getProjectServiceType(project), q);
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
        initialProjects.filter((project) => {
          if (!isProjectBiddingLive(project) || expiredIds.has(project.id)) return false;
          if (
            !isConstructionFirmEnabled() &&
            getProjectServiceType(project) === 'construction_firm'
          ) {
            return false;
          }
          return true;
        }),
      ),
    [initialProjects, expiredIds],
  );

  const filteredProjects = useMemo(() => {
    const filtered = liveProjects.filter((project) => {
      const matchesService =
        serviceFilter === 'all' || getProjectServiceType(project) === serviceFilter;
      return matchesService && matchesProjectSearch(project, locationSearch);
    });
    return sortShowcaseProjectsByLatest(filtered);
  }, [liveProjects, serviceFilter, locationSearch]);

  /** Homepage preview: exactly 6 cards (3 rows × 2 columns). */
  const displayProjects = filteredProjects.slice(0, 6);
  const hasActiveSearch = locationSearch.trim().length > 0;

  const filterButtonClass = (active: boolean) =>
    cn(
      'px-3 py-2 rounded-full text-xs font-semibold border transition-all',
      active
        ? heroOverlay
          ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
          : 'bg-emerald-500/12 border-emerald-600/30 text-emerald-800 dark:border-emerald-500/35 dark:text-emerald-300'
        : heroOverlay
          ? 'bg-white/5 border-white/15 text-white/70 hover:text-white hover:border-white/25'
          : 'border-border/70 bg-muted/30 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground',
    );

  return (
    <div className="relative">
      <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className={cn('text-xl font-bold tracking-tight sm:text-2xl', heroOverlay ? 'text-white' : 'text-foreground')}>
          {t('home.auctions.liveTitle')}
        </h2>
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
          {t('home.auctions.open', { count: filteredProjects.length })}
        </span>
      </div>

      <div
        className={cn(
          'rounded-2xl border p-4 sm:p-5',
          heroOverlay
            ? 'border-white/15 bg-white/5 backdrop-blur-sm'
            : 'border-border/70 bg-muted/20 dark:bg-muted/10',
        )}
      >
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by service type">
            {FILTER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setServiceFilter(id)}
                className={filterButtonClass(serviceFilter === id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-full lg:max-w-xs lg:shrink-0">
            <Input
              type="search"
              value={locationSearch}
              onChange={(event) => setLocationSearch(event.target.value)}
              placeholder="Search by category, location, or title"
              aria-label="Search by category, location, or title"
              prefix={<Search className="h-4 w-4" />}
              className={cn(
                heroOverlay &&
                  'border-white/20 bg-white/10 text-white placeholder:text-white/55 focus:border-emerald-300/50',
              )}
            />
          </div>
        </div>

        {displayProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayProjects.map((project) => (
              <ShowcaseProjectCard
                key={project.id}
                project={project}
                role={role}
                onExpire={handleExpire}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {hasActiveSearch || serviceFilter !== 'all'
                ? 'No matching projects'
                : t('home.showcase.emptyTitle')}
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              {hasActiveSearch || serviceFilter !== 'all'
                ? 'Try a different category (e.g. Mistri, Firm, Painter), location, or project name.'
                : t('home.showcase.emptyDesc')}
            </p>
            {!isAuthenticated && !hasActiveSearch && serviceFilter === 'all' && (
              <Button asChild>
                <Link href="/register?role=owner">{t('home.hero.startPosting')}</Link>
              </Button>
            )}
          </div>
        )}

        <div className="flex w-full items-center justify-center pt-6 pb-2">
          <Link
            href="/projects"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-6 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/10',
              heroOverlay && 'border-emerald-300/40 text-emerald-100 hover:bg-emerald-400/15',
            )}
          >
            {t('home.auctions.viewAllProjects')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

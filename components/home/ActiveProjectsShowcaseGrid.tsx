'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { ShowcaseProjectCard } from './ShowcaseProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  isHomeAuctionProject,
  sortShowcaseProjectsByLatest,
  type ShowcaseProject,
} from '@/lib/projectShowcase';
import {
  getProjectServiceType,
  getServiceCategoryOption,
} from '@/lib/project/display';
import { getLiveAuctionDisplayTitle } from '@/lib/generateProjectTitle';
import { isConstructionFirmEnabled } from '@/lib/features';
import type { ServiceType } from '@/lib/types';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';
import { ProjectServiceFilterPills } from '@/components/projects/ProjectServiceFilterPills';
import type { ProjectServiceFilter } from '@/lib/projects/serviceFilterOptions';

interface ActiveProjectsShowcaseGridProps {
  projects: ShowcaseProject[];
  isAuthenticated: boolean;
  role: string | null;
  heroOverlay?: boolean;
}

/** Extra tokens so short searches like "mistri" / "firm" match the right category. */
const CATEGORY_SEARCH_ALIASES: Partial<Record<ServiceType, string[]>> = {
  labour_contractor: ['mistri', 'mistri worker', 'mistri contractor', 'labour', 'labor', 'labour contractor', 'chowkhat', 'door frame', 'window frame'],
  construction_firm: ['firm', 'construction firm', 'turnkey'],
  drawing_design: ['drawing', 'design', 'drawings', 'drawing and design'],
  painter: ['painter', 'paint', 'painting'],
  plumber: ['plumber', 'plumbing'],
  electrician: ['electrician', 'electric', 'electrical'],
  false_ceiling_work: ['interior', 'interior work', 'false ceiling', 'modular kitchen', 'kitchen'],
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

  const fields = [
    getLiveAuctionDisplayTitle(project),
    project.title,
    city,
    project.district,
    project.state,
  ].filter((value): value is string => Boolean(value && value.trim()));

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
  const [serviceFilter, setServiceFilter] = useState<ProjectServiceFilter>('all');
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
          if (!isHomeAuctionProject(project) || expiredIds.has(project.id)) return false;
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

  return (
    <div className="relative h-auto">
      <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#22c55e]" />
        </span>
        <h2 className={cn('text-xl font-bold tracking-tight sm:text-2xl', heroOverlay ? 'text-white' : 'text-foreground')}>
          {t('home.auctions.liveTitle')}
        </h2>
        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
          {t('home.auctions.open', { count: filteredProjects.length })}
        </span>
      </div>

      <div>
        <div className="mb-6 flex w-full flex-col gap-4">
          <ProjectServiceFilterPills
            value={serviceFilter}
            onChange={setServiceFilter}
          />
          <div className="w-full">
            <Input
              type="search"
              value={locationSearch}
              onChange={(event) => setLocationSearch(event.target.value)}
              placeholder="Search by category, location, or title"
              aria-label="Search by category, location, or title"
              prefix={<Search className="h-4 w-4" />}
              className={cn(
                'border-zinc-200 bg-white text-slate-900 placeholder:text-zinc-500',
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400',
                heroOverlay &&
                  'border-white/20 bg-white/10 text-white placeholder:text-white/55 focus:border-emerald-300/50 dark:border-white/20 dark:bg-white/10',
              )}
            />
          </div>
        </div>

        {displayProjects.length > 0 ? (
          <div className="mx-auto grid h-auto w-full max-w-5xl grid-cols-1 content-start justify-items-center gap-6 md:grid-cols-2">
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
          <div className="px-6 py-14 text-center sm:py-16">
            <Sparkles className="mx-auto mb-4 h-6 w-6 text-emerald-500" />
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
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover hover:underline"
          >
            {t('home.auctions.viewAllProjects')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

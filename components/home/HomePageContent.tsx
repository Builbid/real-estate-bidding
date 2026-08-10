'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, Building2, Calculator, Clock, Gavel,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
import { ServiceCategoryBar } from '@/components/home/ServiceCategoryBar';
import { FeaturedFirmsSection } from '@/components/home/FeaturedFirmsSection';
import { OwnerPostProjectFab } from '@/components/owner/OwnerPostProjectFab';
import { ProjectDistrictFilter, type DistrictFilterValue } from '@/components/shared/ProjectDistrictFilter';
import { Button } from '@/components/ui/button';
import { getUniqueDistrictsFromProjects, matchesDistrictFilter } from '@/lib/project/districtFilter';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { getDashboardPath, normalizeRole } from '@/lib/auth/roles';
import type { DemoFirm } from '@/lib/data/demoFirms';
import type { Project } from '@/lib/types';
import type { ShowcaseProject } from '@/lib/projectShowcase';
import { STAT_ICON_STYLES, type StatIconColor } from '@/lib/dashboard/statIconStyles';
import { cn } from '@/lib/utils';

interface HomePageContentProps {
  showcaseProjects: ShowcaseProject[];
  frozenProjects: Project[];
  statValues: Record<string, number>;
  isAuthenticated: boolean;
  role: string | null;
  ownerHasProjects?: boolean;
  featuredLabour: DemoFirm[];
  featuredFirms: DemoFirm[];
}

export function HomePageContent({
  showcaseProjects,
  frozenProjects,
  statValues,
  isAuthenticated,
  role,
  ownerHasProjects = false,
  featuredLabour,
  featuredFirms,
}: HomePageContentProps) {
  const { t } = useTranslation();
  const [frozenDistrictFilter, setFrozenDistrictFilter] = useState<DistrictFilterValue>('all');

  const frozenDistricts = useMemo(
    () => getUniqueDistrictsFromProjects(frozenProjects),
    [frozenProjects],
  );

  const filteredFrozenProjects = useMemo(
    () => frozenProjects.filter((project) => matchesDistrictFilter(project.district, frozenDistrictFilter)),
    [frozenProjects, frozenDistrictFilter],
  );

  const normalizedRole = role ? normalizeRole(role) : null;

  const STATS_CONFIG: Array<{
    key: string;
    label: string;
    icon: typeof Activity;
    tone: StatIconColor;
  }> = [
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, tone: 'emerald' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, tone: 'violet' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, tone: 'teal' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, tone: 'amber' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar overlay authHint={{ isAuthenticated, role }} />

      <section className="relative overflow-x-hidden border-b border-border/60">
        <HeroBackgroundSlideshow />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-3">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl">
              <span className="text-foreground">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-600 dark:text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-600 dark:text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-foreground">{t('home.hero.titleSuffix')}</span>
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-xs leading-snug text-muted-foreground sm:text-sm line-clamp-2">
              {t('home.hero.subtitle')}
            </p>

            <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:flex-wrap">
              {isAuthenticated && normalizedRole ? (
                <Button asChild size="default" className="rounded-xl h-10">
                  <Link href={getDashboardPath(normalizedRole)}>
                    {t('home.hero.goDashboard')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="default" className="rounded-xl h-10">
                  <Link href="/signup">{t('common.createAccount')}</Link>
                </Button>
              )}
              <Button
                asChild
                size="default"
                variant="outline"
                className={cn(
                  'group relative h-10 overflow-hidden rounded-xl border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-amber-500/10',
                  'px-3.5 font-semibold text-foreground shadow-sm backdrop-blur-sm',
                  'transition-all duration-200 hover:border-emerald-500/55 hover:from-emerald-500/15 hover:via-teal-500/10 hover:to-amber-500/15 hover:shadow-md',
                )}
              >
                <Link href="/estimate-calculator" className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/25 transition-transform duration-200 group-hover:scale-105">
                    <Calculator className="h-3.5 w-3.5" />
                  </span>
                  <span className="inline-flex items-baseline gap-1.5 tracking-tight">
                    <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm dark:bg-emerald-500">
                      Free
                    </span>
                    <span className="text-sm">Estimate Calculator</span>
                  </span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {STATS_CONFIG.map(({ key, label, icon: Icon, tone }) => (
              <div
                key={key}
                className="rounded-xl border border-border/70 bg-card/80 px-2.5 py-2 shadow-sm backdrop-blur-sm sm:px-3 sm:py-2.5"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', STAT_ICON_STYLES[tone].box)}>
                    <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', STAT_ICON_STYLES[tone].icon)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold tabular-nums text-foreground sm:text-lg leading-none">
                      {statValues[key].toLocaleString()}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-muted-foreground sm:text-[11px] mt-0.5">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <ServiceCategoryBar isAuthenticated={isAuthenticated} role={role} />
          </div>
        </div>
      </section>

      <section id="live-auctions" className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10 sm:pb-28">
        <ActiveProjectsShowcaseGrid
          projects={showcaseProjects}
          isAuthenticated={isAuthenticated}
          role={role}
        />

        {frozenProjects.length > 0 && (
          <div className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {t('home.auctions.selectionTitle')}
                </h2>
                <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
                  {t('home.auctions.projects', { count: filteredFrozenProjects.length })}
                </span>
              </div>
              {frozenDistricts.length > 0 && (
                <ProjectDistrictFilter
                  value={frozenDistrictFilter}
                  onChange={setFrozenDistrictFilter}
                  districts={frozenDistricts}
                />
              )}
            </div>
            {filteredFrozenProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 auto-rows-fr sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-6">
                {filteredFrozenProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isAuthenticated={isAuthenticated}
                    variant="compact"
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">{t('home.auctions.noDistrictProjects')}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <FeaturedFirmsSection labourFirms={featuredLabour} constructionFirms={featuredFirms} />

      <OwnerPostProjectFab
        role={role}
        isAuthenticated={isAuthenticated}
        emphasize={role === 'owner' && !ownerHasProjects}
      />
    </div>
  );
}

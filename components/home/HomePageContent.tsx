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

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {t('home.hero.platformBadge')}
            </p>
            <h1 className="text-2xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl">
              <span className="text-foreground">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-600 dark:text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-600 dark:text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-foreground">{t('home.hero.titleSuffix')}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('home.hero.subtitle')}
            </p>

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              {isAuthenticated && normalizedRole ? (
                <Button asChild size="lg" className="rounded-xl">
                  <Link href={getDashboardPath(normalizedRole)}>
                    {t('home.hero.goDashboard')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="rounded-xl">
                  <Link href="/signup">{t('common.createAccount')}</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="rounded-xl">
                <Link href="/estimate-calculator">
                  <Calculator className="mr-1 h-4 w-4" />
                  Estimate Calculator
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-xl text-muted-foreground">
                <a href="#live-auctions">{t('nav.liveProjects')}</a>
              </Button>
            </div>

          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {STATS_CONFIG.map(({ key, label, icon: Icon, tone }) => (
              <div
                key={key}
                className="rounded-2xl border border-border/70 bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4 sm:py-4"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10', STAT_ICON_STYLES[tone].box)}>
                    <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', STAT_ICON_STYLES[tone].icon)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold tabular-nums text-foreground sm:text-xl">{statValues[key].toLocaleString()}</p>
                    <p className="truncate text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <ServiceCategoryBar isAuthenticated={isAuthenticated} role={role} />
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

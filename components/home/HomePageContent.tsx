'use client';

import { useMemo, useState } from 'react';
import {
  Activity, BadgeCheck, Building2, Clock, Gavel, Star,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
import { ServiceCategoryBar } from '@/components/home/ServiceCategoryBar';
import { FeaturedFirmsSection } from '@/components/home/FeaturedFirmsSection';
import { ProjectDistrictFilter, type DistrictFilterValue } from '@/components/shared/ProjectDistrictFilter';
import { getUniqueDistrictsFromProjects, matchesDistrictFilter } from '@/lib/project/districtFilter';
import { useTranslation } from '@/lib/context/LanguageProvider';
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
  featuredLabour: DemoFirm[];
  featuredFirms: DemoFirm[];
}

export function HomePageContent({
  showcaseProjects,
  frozenProjects,
  statValues,
  isAuthenticated,
  role,
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

  const TRUST_BADGES = [
    { icon: BadgeCheck, text: t('home.trust.verifiedBuilders'), color: 'text-violet-400' },
    { icon: Star, text: t('home.trust.transparentPricing'), color: 'text-amber-400' },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar overlay authHint={{ isAuthenticated, role }} />

      <section className="relative overflow-x-hidden border-b border-border/60">
        <HeroBackgroundSlideshow />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-6 pt-3 sm:gap-8 sm:px-6 sm:pb-8 sm:pt-5">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl">
              <span className="text-foreground">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-600 dark:text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-600 dark:text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-foreground">{t('home.hero.titleSuffix')}</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {TRUST_BADGES.map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 sm:text-[13px]">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <ServiceCategoryBar isAuthenticated={isAuthenticated} role={role} />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
            {STATS_CONFIG.map(({ key, label, icon: Icon, tone }) => (
              <div
                key={key}
                className="rounded-xl border border-border/70 bg-card/80 px-2.5 py-2.5 shadow-sm backdrop-blur-sm sm:px-3 sm:py-3"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', STAT_ICON_STYLES[tone].box)}>
                    <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', STAT_ICON_STYLES[tone].icon)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold tabular-nums text-foreground sm:text-lg leading-none">
                      {statValues[key].toLocaleString()}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-slate-700 dark:text-slate-300 sm:text-[11px]">
                      {label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="live-auctions" className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 sm:pb-20">
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
    </div>
  );
}

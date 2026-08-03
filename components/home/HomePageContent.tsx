'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  Activity, Gavel, Clock,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
import { FeaturedFirmsSection } from '@/components/home/FeaturedFirmsSection';
import { OwnerPostProjectFab } from '@/components/owner/OwnerPostProjectFab';
import { ProjectDistrictFilter, type DistrictFilterValue } from '@/components/shared/ProjectDistrictFilter';
import { getUniqueDistrictsFromProjects, matchesDistrictFilter } from '@/lib/project/districtFilter';
import { useTranslation } from '@/lib/context/LanguageProvider';
import type { Project } from '@/lib/types';
import type { ShowcaseProject } from '@/lib/projectShowcase';

interface HomePageContentProps {
  showcaseProjects: ShowcaseProject[];
  frozenProjects: Project[];
  statValues: Record<string, number>;
  isAuthenticated: boolean;
  role: string | null;
  ownerHasProjects?: boolean;
}

export function HomePageContent({
  showcaseProjects,
  frozenProjects,
  statValues,
  isAuthenticated,
  role,
  ownerHasProjects = false,
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

  const STATS_CONFIG = [
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, iconBorder: 'border-slate-200', iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, iconBorder: 'border-slate-200', iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, iconBorder: 'border-slate-200', iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, iconBorder: 'border-slate-200', iconColor: 'text-rose-600', iconBg: 'bg-rose-50' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar overlay authHint={{ isAuthenticated, role }} />

      <section className="relative overflow-x-hidden bg-white">
        <HeroBackgroundSlideshow />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
          <div className="mx-auto mb-6 max-w-xl text-center sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.12] tracking-tight">
              <span className="text-slate-900">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-600">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-600">{t('home.hero.bidding')}</span>{' '}
              <span className="text-slate-900">{t('home.hero.titleSuffix')}</span>
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {STATS_CONFIG.map(({ key, label, icon: Icon, iconBorder, iconColor, iconBg }) => (
              <div
                key={key}
                className="flex items-center gap-2.5 sm:gap-3 bg-transparent px-3 py-3 sm:px-4 sm:py-3.5"
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${iconBorder} ${iconBg}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{statValues[key].toLocaleString()}</p>
                  <p className="text-xs leading-tight text-slate-600">{label}</p>
                </div>
              </div>
            ))}
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

      <FeaturedFirmsSection />

      <OwnerPostProjectFab
        role={role}
        isAuthenticated={isAuthenticated}
        emphasize={role === 'owner' && !ownerHasProjects}
      />
    </div>
  );
}

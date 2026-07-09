'use client';

import {
  Building2,
  Activity, Gavel, Clock,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
import { FeaturedFirmsSection } from '@/components/home/FeaturedFirmsSection';
import { useTranslation } from '@/lib/context/LanguageProvider';
import type { Project } from '@/lib/types';
import type { ShowcaseProject } from '@/lib/projectShowcase';

interface HomePageContentProps {
  showcaseProjects: ShowcaseProject[];
  frozenProjects: Project[];
  statValues: Record<string, number>;
  isAuthenticated: boolean;
  role: string | null;
}

export function HomePageContent({
  showcaseProjects,
  frozenProjects,
  statValues,
  isAuthenticated,
  role,
}: HomePageContentProps) {
  const { t } = useTranslation();

  const STATS_CONFIG = [
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, iconBorder: 'border-slate-200', iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, iconBorder: 'border-slate-200', iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, iconBorder: 'border-slate-200', iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, iconBorder: 'border-slate-200', iconColor: 'text-rose-600', iconBg: 'bg-rose-50' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative flex h-screen w-full flex-col overflow-hidden bg-white">
        <HeroBackgroundSlideshow />
        <Navbar overlay />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between px-4 pb-8 pt-[4.25rem] sm:px-6 sm:pb-10 sm:pt-[4.5rem]">
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 mb-2.5 text-[11px] sm:text-xs font-semibold text-violet-700">
              <Gavel className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
              {t('home.hero.platformBadge')}
            </div>

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

      <section id="live-auctions" className="bg-background max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-10 sm:pb-12">
        <div className="mb-8 sm:mb-10">
          <ActiveProjectsShowcaseGrid
            projects={showcaseProjects}
            isAuthenticated={isAuthenticated}
            role={role}
          />
        </div>

        {frozenProjects.length > 0 && (
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <h2 className="text-xl font-bold text-foreground">{t('home.auctions.selectionTitle')}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                {t('home.auctions.projects', { count: frozenProjects.length })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {frozenProjects.map((project) => (
                <ProjectCard key={project.id} project={project} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          </div>
        )}
      </section>

      <FeaturedFirmsSection />
    </div>
  );
}

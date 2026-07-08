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
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, iconBg: 'bg-blue-400/20', iconBorder: 'border-blue-300/30', iconColor: 'text-blue-200' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, iconBg: 'bg-violet-400/20', iconBorder: 'border-violet-300/30', iconColor: 'text-violet-200' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, iconBg: 'bg-amber-400/20', iconBorder: 'border-amber-300/30', iconColor: 'text-amber-200' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, iconBg: 'bg-rose-400/20', iconBorder: 'border-rose-300/30', iconColor: 'text-rose-200' },
  ];

  return (
    <div className="min-h-screen text-foreground">
      <section className="relative min-h-screen w-full overflow-hidden">
        <HeroBackgroundSlideshow />
        <Navbar overlay />

        <div className="absolute inset-0 pointer-events-none z-[1]">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-amber-500/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-[500px] h-[200px] bg-blue-500/6 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-[4.25rem] pb-4 sm:pt-[4.5rem] sm:pb-5">
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/25 px-3 py-1 mb-2.5 text-[11px] sm:text-xs font-semibold text-violet-50 shadow-lg shadow-violet-900/20 backdrop-blur-md">
              <Gavel className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
              {t('home.hero.platformBadge')}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.12] tracking-tight drop-shadow-sm">
              <span className="text-white">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-white">{t('home.hero.titleSuffix')}</span>
            </h1>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-8 sm:pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {STATS_CONFIG.map(({ key, label, icon: Icon, iconBg, iconBorder, iconColor }) => (
              <div
                key={key}
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-3.5"
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${iconBg} ${iconBorder}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-white sm:text-xl">{statValues[key].toLocaleString()}</p>
                  <p className="text-xs leading-tight text-white/70">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section id="live-auctions" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-10 sm:pb-12">
          <div className="mb-8 sm:mb-10">
            <ActiveProjectsShowcaseGrid
              projects={showcaseProjects}
              isAuthenticated={isAuthenticated}
              role={role}
              heroOverlay
            />
          </div>

          {frozenProjects.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <h2 className="text-xl font-bold text-white">{t('home.auctions.selectionTitle')}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-400/15 text-violet-200 border border-violet-300/25 font-semibold">
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
      </section>

      <FeaturedFirmsSection />
    </div>
  );
}

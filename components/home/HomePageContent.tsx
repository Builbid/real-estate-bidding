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
import { HomeMarqueeTicker } from '@/components/home/HomeMarqueeTicker';
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
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, iconBg: 'bg-blue-500/15', iconBorder: 'border-blue-500/30', iconColor: 'text-blue-400' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, iconBg: 'bg-violet-500/15', iconBorder: 'border-violet-500/30', iconColor: 'text-violet-400' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, iconBg: 'bg-amber-500/15', iconBorder: 'border-amber-500/30', iconColor: 'text-amber-400' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, iconBg: 'bg-rose-500/15', iconBorder: 'border-rose-500/30', iconColor: 'text-rose-400' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden">
        <HeroBackgroundSlideshow />
        <Navbar overlay />

        <div className="absolute inset-0 pointer-events-none z-[1]">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-amber-500/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-[500px] h-[200px] bg-blue-500/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-[4.25rem] pb-4 sm:pt-[4.5rem] sm:pb-5 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/45 bg-violet-500/20 px-2.5 py-0.5 mb-2 text-[10px] sm:text-[11px] font-semibold text-violet-100 shadow-sm backdrop-blur-sm">
              <Gavel className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
              {t('home.hero.platformBadge')}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.12] tracking-tight">
              <span className="text-white">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-white">{t('home.hero.titleSuffix')}</span>
            </h1>
          </div>
        </div>

        <HomeMarqueeTicker />
      </section>

      <section className="border-y border-border bg-card/80 dark:bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {STATS_CONFIG.map(({ key, label, icon: Icon, iconBg, iconBorder, iconColor }) => (
            <div key={key} className="flex items-center gap-2.5 sm:gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${iconBg} border ${iconBorder} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-foreground">{statValues[key].toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="live-auctions" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-8 sm:pb-10">
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

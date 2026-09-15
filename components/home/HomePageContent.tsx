'use client';

import dynamic from 'next/dynamic';
import {
  Activity, BadgeCheck, Building2, Clock, Gavel, Star,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
import { ServiceCategoryBar } from '@/components/home/ServiceCategoryBar';
import { useTranslation } from '@/lib/context/LanguageProvider';
import type { DemoFirm } from '@/lib/data/demoFirms';
import type { ShowcaseProject } from '@/lib/projectShowcase';
import type { StatIconColor } from '@/lib/dashboard/statIconStyles';
import { cn } from '@/lib/utils';
import { useClientAuthHint } from '@/lib/auth/useClientAuthHint';

const FeaturedFirmsSection = dynamic(
  () => import('@/components/home/FeaturedFirmsSection').then((mod) => mod.FeaturedFirmsSection),
  { ssr: true },
);

interface HomePageContentProps {
  showcaseProjects: ShowcaseProject[];
  statValues: Record<string, number>;
  featuredFirms: DemoFirm[];
}

export function HomePageContent({
  showcaseProjects,
  statValues,
  featuredFirms,
}: HomePageContentProps) {
  const { t } = useTranslation();
  const { isAuthenticated, role } = useClientAuthHint();

  const STATS_CONFIG: Array<{
    key: string;
    label: string;
    icon: typeof Activity;
    tone: StatIconColor;
  }> = [
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, tone: 'emerald' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, tone: 'violet' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, tone: 'teal' },
    { key: 'approved', label: t('home.stats.projectsApproved'), icon: BadgeCheck, tone: 'indigo' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, tone: 'amber' },
  ];

  const TRUST_BADGES = [
    { icon: BadgeCheck, text: t('home.trust.verifiedBuilders'), color: 'text-violet-400' },
    { icon: Star, text: t('home.trust.transparentPricing'), color: 'text-amber-400' },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar overlay authHint={{ isAuthenticated, role }} />

      <section className="relative overflow-x-hidden border-b border-border/60 bg-white dark:bg-background">
        <HeroBackgroundSlideshow />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-6 pt-3 sm:gap-8 sm:pb-8 sm:pt-5">
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

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {STATS_CONFIG.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className="flex items-center gap-2 sm:gap-2.5">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 sm:h-5 sm:w-5',
                    tone === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                    tone === 'violet' && 'text-violet-500 dark:text-violet-400',
                    tone === 'teal' && 'text-teal-500 dark:text-teal-400',
                    tone === 'indigo' && 'text-indigo-500 dark:text-indigo-400',
                    tone === 'amber' && 'text-amber-600 dark:text-amber-400',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-base font-bold tabular-nums text-foreground sm:text-lg leading-none">
                    {(statValues[key] ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-slate-700 dark:text-slate-300 sm:text-[11px]">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="live-auctions" className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 sm:pb-20">
        <ActiveProjectsShowcaseGrid
          projects={showcaseProjects}
          isAuthenticated={isAuthenticated}
          role={role}
        />
      </section>

      <FeaturedFirmsSection constructionFirms={featuredFirms} />
    </div>
  );
}

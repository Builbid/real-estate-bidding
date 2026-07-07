'use client';

import Link from 'next/link';
import {
  Building2, Shield, ArrowRight,
  Activity, Gavel, Star, Clock, BadgeCheck,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
import { FeaturedFirmsSection } from '@/components/home/FeaturedFirmsSection';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { useOptionalProfileUpdate } from '@/lib/context/ProfileProvider';
import { normalizeRole } from '@/lib/auth/roles';
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
  const profileCtx = useOptionalProfileUpdate();
  const liveAuthenticated = profileCtx ? !!profileCtx.profile : isAuthenticated;
  const liveRole = profileCtx?.profile
    ? normalizeRole(profileCtx.profile.role)
    : role;

  const STATS_CONFIG = [
    { key: 'active', label: t('home.stats.activeAuctions'), icon: Activity, iconBg: 'bg-blue-500/15', iconBorder: 'border-blue-500/30', iconColor: 'text-blue-400' },
    { key: 'frozen', label: t('home.stats.pendingSelection'), icon: Clock, iconBg: 'bg-violet-500/15', iconBorder: 'border-violet-500/30', iconColor: 'text-violet-400' },
    { key: 'total', label: t('home.stats.totalProjects'), icon: Building2, iconBg: 'bg-amber-500/15', iconBorder: 'border-amber-500/30', iconColor: 'text-amber-400' },
    { key: 'bids', label: t('home.stats.bidsSubmitted'), icon: Gavel, iconBg: 'bg-rose-500/15', iconBorder: 'border-rose-500/30', iconColor: 'text-rose-400' },
  ];

  const TRUST_BADGES = [
    { icon: BadgeCheck, text: t('home.trust.verifiedBuilders'), color: 'text-violet-400' },
    { icon: Shield, text: t('home.trust.privateContact'), color: 'text-blue-400' },
    { icon: Star, text: t('home.trust.transparentPricing'), color: 'text-amber-400' },
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-16 pb-5 sm:pb-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/45 bg-violet-500/20 px-3 py-1 mb-2.5 text-[11px] sm:text-xs font-semibold text-violet-100 shadow-sm backdrop-blur-sm">
              <Gavel className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              {t('home.hero.platformBadge')}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold leading-[1.15] tracking-tight mb-2 sm:mb-3">
              <span className="text-white">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-white">{t('home.hero.titleSuffix')}</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-100 mb-4 max-w-xs sm:max-w-md mx-auto leading-snug">
              {t('home.hero.subtitle')}
            </p>

            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="flex flex-row items-stretch justify-center gap-3 w-full max-w-md mx-auto">
                <Button
                  size="default"
                  asChild
                  className="flex-1 min-w-0 h-auto py-3 px-3 text-sm sm:text-base"
                >
                  <Link
                    href={liveAuthenticated ? `/dashboard/${liveRole}` : '/register?role=owner'}
                    aria-label={liveAuthenticated ? t('home.hero.goDashboard') : `${t('home.hero.startPosting')} — register as project owner`}
                  >
                    <span className="truncate">{liveAuthenticated ? t('home.hero.goDashboard') : t('home.hero.startPosting')}</span>{' '}
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                  </Link>
                </Button>
                {!liveAuthenticated && (
                  <Button
                    size="default"
                    variant="outline"
                    asChild
                    className="flex-1 min-w-0 h-auto py-3 px-3 text-sm sm:text-base border-white/30 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link
                      href="/register?role=bidder"
                      aria-label={`${t('home.hero.imBuilder')} — register as contractor or construction firm`}
                    >
                      <span className="truncate">{t('home.hero.imBuilder')}</span>{' '}
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                    </Link>
                  </Button>
                )}
              </div>
              {!liveAuthenticated && (
                <p className="text-[11px] sm:text-xs text-slate-200">
                  Already have an account?{' '}
                  <Link href="/login" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
                    Sign in
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-nowrap items-center justify-center gap-x-3 sm:gap-x-4 mt-3 sm:mt-4 overflow-x-auto scrollbar-hide">
              {TRUST_BADGES.map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-200 whitespace-nowrap flex-shrink-0">
                  <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${color}`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/80 dark:bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS_CONFIG.map(({ key, label, icon: Icon, iconBg, iconBorder, iconColor }) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${iconBg} border ${iconBorder} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{statValues[key].toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FeaturedFirmsSection />

      <section id="live-auctions" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-10 sm:pb-16">
        <div className="mb-12">
          <ActiveProjectsShowcaseGrid
            projects={showcaseProjects}
            isAuthenticated={isAuthenticated}
            role={role}
          />
        </div>

        {frozenProjects.length > 0 && (
          <div className="mb-12">
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
    </div>
  );
}

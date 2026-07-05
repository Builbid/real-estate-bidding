'use client';

import Link from 'next/link';
import {
  Building2, TrendingUp, Shield, Zap, Users, ArrowRight,
  Activity, Gavel, Star, Clock, BadgeCheck,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { HeroBackgroundSlideshow } from '@/components/shared/HeroBackgroundSlideshow';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { ActiveProjectsShowcaseGrid } from '@/components/home/ActiveProjectsShowcaseGrid';
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

  const FEATURES = [
    {
      icon: Shield,
      title: t('home.features.privacyTitle'),
      description: t('home.features.privacyDesc'),
      gradient: 'from-violet-500/20 to-violet-500/5',
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/15 border-violet-500/30',
      iconColor: 'text-violet-400',
    },
    {
      icon: Zap,
      title: t('home.features.realtimeTitle'),
      description: t('home.features.realtimeDesc'),
      gradient: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      iconColor: 'text-amber-400',
    },
    {
      icon: TrendingUp,
      title: t('home.features.marketTitle'),
      description: t('home.features.marketDesc'),
      gradient: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      icon: Users,
      title: t('home.features.multiRoleTitle'),
      description: t('home.features.multiRoleDesc'),
      gradient: 'from-rose-500/20 to-rose-500/5',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/15 border-rose-500/30',
      iconColor: 'text-rose-400',
    },
  ];

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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              <span className="text-white">{t('home.hero.titlePrefix')}</span>{' '}
              <span className="text-violet-400">{t('home.hero.construction')}</span>{' '}
              <span className="text-amber-400">{t('home.hero.bidding')}</span>{' '}
              <span className="text-white">{t('home.hero.titleSuffix')}</span>
            </h1>

            <p className="text-lg text-slate-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('home.hero.subtitle')}
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="xl" asChild>
                  <Link
                    href={liveAuthenticated ? `/dashboard/${liveRole}` : '/register?role=owner'}
                    aria-label={liveAuthenticated ? t('home.hero.goDashboard') : `${t('home.hero.startPosting')} — register as project owner`}
                  >
                    {liveAuthenticated ? t('home.hero.goDashboard') : t('home.hero.startPosting')}{' '}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                {!liveAuthenticated && (
                  <Button
                    size="xl"
                    variant="outline"
                    asChild
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link
                      href="/register?role=bidder"
                      aria-label={`${t('home.hero.imBuilder')} — register as contractor or construction firm`}
                    >
                      {t('home.hero.imBuilder')}{' '}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                )}
              </div>
              {!liveAuthenticated && (
                <p className="text-sm text-slate-200">
                  Already have an account?{' '}
                  <Link href="/login" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
                    Sign in
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
              {TRUST_BADGES.map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-200">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
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

      <section id="live-auctions" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
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

      <section className="border-t border-border bg-card/80 dark:bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t('home.features.sectionTitle')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t('home.features.sectionDesc')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, gradient, border, iconBg, iconColor }) => (
              <div
                key={title}
                className={`rounded-xl border ${border} bg-gradient-to-br ${gradient} p-5 hover:scale-[1.02] transition-transform`}
              >
                <div className={`w-10 h-10 rounded-lg ${iconBg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

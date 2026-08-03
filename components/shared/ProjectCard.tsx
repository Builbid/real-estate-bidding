'use client';

import Link from 'next/link';
import { MapPin, Clock, ArrowRight, Building, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTicker } from './CountdownTicker';
import { Button } from '@/components/ui/button';
import { cn, formatProjectPostedAt } from '@/lib/utils';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import {
  getFinishingBadge,
  getProjectBudgetDisplay,
  getProjectFloorAreaDisplay,
  getProjectServiceType,
  getServiceBadgeLabel,
  isFirmProject,
} from '@/lib/project/display';
import { useTranslation } from '@/lib/context/LanguageProvider';
import type { Project, ProjectStatus } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  bidCount?: number;
  lowestRate?: number;
  showLeaderboard?: boolean;
  isAuthenticated?: boolean;
  /** Tighter layout for homepage listing sections */
  variant?: 'default' | 'compact';
}

export function ProjectCard({
  project,
  bidCount = 0,
  lowestRate,
  showLeaderboard = false,
  isAuthenticated = false,
  variant = 'default',
}: ProjectCardProps) {
  const { t } = useTranslation();
  const statusLabel = t(`status.${project.status}` as `status.${ProjectStatus}`);
  const trackLabel = t(`track.${project.track_type}`);
  const isActive = project.status === 'active_24h';
  const isFrozen = project.status === 'frozen_24h';
  const isFirm = isFirmProject(project);
  const serviceType = getProjectServiceType(project);
  const floorArea = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);
  const finishingBadge = getFinishingBadge(project.finishing_level);
  const postedAt = formatProjectPostedAt(project.created_at);
  const compact = variant === 'compact';

  return (
    <Card className={cn(
      'group relative flex h-full flex-col overflow-hidden transition-all duration-300 rounded-2xl',
      compact
        ? 'border-border/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
        : 'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:-translate-y-0.5',
      isActive && 'border-emerald-500/25 hover:border-emerald-500/45',
      isFrozen && 'border-indigo-500/25 hover:border-indigo-500/40',
    )}>
      {/* Status strip */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5',
        isActive && 'bg-gradient-to-r from-emerald-500 to-teal-500',
        isFrozen && 'bg-gradient-to-r from-indigo-500 to-blue-500',
        !isActive && !isFrozen && 'bg-secondary'
      )} />

      <CardContent className={cn('flex flex-1 flex-col', compact ? 'px-4 py-4 sm:px-5 sm:py-5' : 'pt-5 pb-5')}>
        <div className={cn('flex items-start justify-between gap-3', compact ? 'mb-3' : 'mb-4')}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'} className="text-[11px]">
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {statusLabel}
              </Badge>
              <Badge variant={isFirm ? 'violet' : 'amber'} className="text-[10px]">
                {getServiceBadgeLabel(serviceType)}
              </Badge>
              {finishingBadge && !compact && (
                <Badge variant="default" className="text-[10px]">{finishingBadge}</Badge>
              )}
              {!isFirm && !compact && (
                <Badge variant="default" className="text-muted-foreground text-[10px]">
                  {trackLabel}
                </Badge>
              )}
            </div>
            <h3 className={cn(
              'font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors',
              compact ? 'text-base' : 'text-base',
            )}>
              {project.title}
            </h3>
            {postedAt && (isActive || isFrozen) && (
              <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {t('project.postedOn')} {postedAt}
              </p>
            )}
          </div>
          {!compact && (
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
              <Building className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className={cn(
          'grid grid-cols-2 gap-2 sm:gap-2.5 mb-4',
          compact && 'flex-1',
        )}>
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('project.district')}</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">{project.district}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('project.totalBids')}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{bidCount}</p>
          </div>
          {floorArea && (
            <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {isFirm ? 'Floor Area' : t('project.plotArea')}
              </p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{floorArea}</p>
            </div>
          )}
          {budgetDisplay && (
            <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{budgetDisplay}</p>
            </div>
          )}
          {!compact && (
            <div className="col-span-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('project.configuration')}</p>
              <BuildingConfigSummary project={project} compact className="text-sm font-medium text-foreground/90 leading-snug mt-0.5" />
            </div>
          )}
          {compact && !isFirm && (
            <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('project.configuration')}</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{trackLabel}</p>
            </div>
          )}
        </div>

        {/* Lowest rate — only shown to authenticated users during frozen/completed */}
        {lowestRate !== undefined && isAuthenticated && !isActive && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-0.5">{t('project.lowestBidRate')}</p>
            <p className="text-lg font-bold text-foreground">₹{lowestRate.toLocaleString('en-IN')}<span className="text-sm font-normal text-muted-foreground">/{t('common.sqft')}</span></p>
          </div>
        )}

        {/* Countdown */}
        {isActive && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1.5">{t('project.biddingClosesIn')}</p>
            <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
          </div>
        )}

        {isFrozen && project.selection_ends_at && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1.5">{t('project.selectionWindow')}</p>
            <CountdownTicker targetDateISO={project.selection_ends_at} compact />
          </div>
        )}

        {/* CTA */}
        <Button variant="outline" size="sm" className="w-full mt-auto group/btn rounded-xl" asChild>
          <Link href={`/project/${project.id}`}>
            <span>{t('project.viewProject')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

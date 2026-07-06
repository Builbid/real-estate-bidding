'use client';

import Link from 'next/link';
import { MapPin, Layers, Clock, Users, ArrowRight, Building, CalendarDays } from 'lucide-react';
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
}

export function ProjectCard({
  project,
  bidCount = 0,
  lowestRate,
  showLeaderboard = false,
  isAuthenticated = false,
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

  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-300',
      'hover:border-border hover:shadow-2xl hover:shadow-black/20',
      isActive && 'border-emerald-500/20 hover:border-emerald-500/40',
      isFrozen && 'border-indigo-500/20 hover:border-indigo-500/30',
    )}>
      {/* Status strip */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5',
        isActive && 'bg-gradient-to-r from-emerald-500 to-teal-500',
        isFrozen && 'bg-gradient-to-r from-indigo-500 to-blue-500',
        !isActive && !isFrozen && 'bg-secondary'
      )} />

      <CardContent className="pt-5 pb-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {statusLabel}
              </Badge>
              <Badge variant={isFirm ? 'violet' : 'amber'} className="text-[10px]">
                {getServiceBadgeLabel(serviceType)}
              </Badge>
              {finishingBadge && (
                <Badge variant="default" className="text-[10px]">{finishingBadge}</Badge>
              )}
              {!isFirm && (
                <Badge variant="default" className="text-muted-foreground">
                  {trackLabel}
                </Badge>
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {project.title}
            </h3>
            {postedAt && (isActive || isFrozen) && (
              <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {t('project.postedOn')} {postedAt}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
            <Building className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">{t('project.district')}</p>
              <p className="text-xs font-medium text-foreground/80">{project.district}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">{t('project.configuration')}</p>
              <BuildingConfigSummary project={project} compact className="text-xs font-medium text-foreground/80 leading-snug" />
            </div>
          </div>
          {floorArea && (
            <div className="flex items-start gap-2">
              <div className="w-3.5 h-3.5 rounded border border-border flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">
                  {isFirm ? 'Floor Area' : t('project.plotArea')}
                </p>
                <p className="text-xs font-medium text-foreground/80">{floorArea}</p>
              </div>
            </div>
          )}
          {budgetDisplay && (
            <div className="flex items-start gap-2 col-span-2">
              <div className="w-3.5 h-3.5 rounded border border-border flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">Budget</p>
                <p className="text-xs font-medium text-foreground/80">{budgetDisplay}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">{t('project.totalBids')}</p>
              <p className="text-xs font-semibold text-foreground">{bidCount}</p>
            </div>
          </div>
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
        <Button variant="outline" size="sm" className="w-full group/btn" asChild>
          <Link href={`/project/${project.id}`}>
            <span>{t('project.viewProject')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

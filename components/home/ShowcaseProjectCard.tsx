'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Layers, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { cn, formatRate, formatProjectPostedDisplay, TRACK_LABELS } from '@/lib/utils';
import {
  getFinishingBadge,
  getProjectBudgetDisplay,
  getProjectFloorAreaDisplay,
  getProjectServiceType,
  getServiceBadgeLabel,
  isFirmProject,
} from '@/lib/project/display';
import {
  formatShowcaseRemaining,
  getShowcaseCardAction,
  type ShowcaseProject,
} from '@/lib/projectShowcase';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { useEffect, useRef, useState } from 'react';

interface ShowcaseProjectCardProps {
  project: ShowcaseProject;
  role: string | null;
  onExpire?: (projectId: string) => void;
}

export function ShowcaseProjectCard({
  project,
  role,
  onExpire,
}: ShowcaseProjectCardProps) {
  const { t } = useTranslation();
  const { href, action } = getShowcaseCardAction(project.id, role, { isDemo: project.isDemo });
  const [remaining, setRemaining] = useState(() =>
    formatShowcaseRemaining(project.bidding_ends_at)
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    function tick() {
      const next = formatShowcaseRemaining(project.bidding_ends_at);
      setRemaining(next);

      if (next.isExpired && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.(project.id);
      }
    }

    tick();
    interval = setInterval(tick, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project.bidding_ends_at, project.id, onExpire]);

  if (remaining.isExpired) return null;

  const isFirm = isFirmProject(project);
  const serviceType = getProjectServiceType(project);
  const floorAreaDisplay = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);
  const finishingBadge = getFinishingBadge(project.finishing_level);
  const postedDisplay = formatProjectPostedDisplay(project.created_at);

  const specifications = [
    { label: t('home.showcase.specLocation'), value: project.district },
    ...(floorAreaDisplay
      ? [{ label: isFirm ? 'Floor Area' : t('home.showcase.specPlotSize'), value: floorAreaDisplay }]
      : []),
    ...(budgetDisplay ? [{ label: 'Budget', value: budgetDisplay }] : []),
    ...(!isFirm ? [{ label: t('home.showcase.specCategory'), value: TRACK_LABELS[project.track_type] }] : []),
    { label: t('home.showcase.specStatus'), value: t('home.showcase.openBidding') },
    ...(project.lowest_rate != null
      ? [{ label: t('home.showcase.leadingRate'), value: formatRate(project.lowest_rate) }]
      : []),
  ];

  return (
    <article className="surface-card-interactive group relative flex h-full min-w-0 flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 opacity-90" />

      <div className="min-w-0 border-b border-border/70 px-5 pt-5 pb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge variant="emerald" className="text-xs">
              <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t('home.showcase.liveBadge')}
            </Badge>
            <Badge variant={isFirm ? 'violet' : 'amber'} className="text-xs">
              {getServiceBadgeLabel(serviceType)}
            </Badge>
            {finishingBadge && (
              <Badge variant="default" className="text-xs">
                {finishingBadge}
              </Badge>
            )}
            {!isFirm && (
              <Badge variant="default" className="text-xs text-muted-foreground">
                {TRACK_LABELS[project.track_type]}
              </Badge>
            )}
          </div>
          <div
            className={cn(
              'flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 shadow-sm',
              'border-border/70 bg-muted/40',
              remaining.isUrgent &&
                'border-red-400/40 bg-red-500/10',
            )}
          >
            <Clock
              className={cn(
                'h-3.5 w-3.5 flex-shrink-0',
                remaining.isUrgent
                  ? 'animate-pulse text-red-500 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            />
            <span
              className={cn(
                'truncate text-xs font-semibold tabular-nums tracking-tight',
                remaining.isUrgent
                  ? 'text-red-600 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-200',
              )}
            >
              {remaining.label}
            </span>
          </div>
        </div>

        <h3 className="line-clamp-2 break-words text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {project.title}
        </h3>

        {project.building_types && project.building_types.length > 0 && (
          <div className="mt-2">
            <BuildingConfigSummary project={project} compact />
          </div>
        )}

        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {specifications.map((spec) => (
            <li key={spec.label} className="flex min-w-0 gap-2">
              <span
                aria-hidden
                className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500"
              />
              <span className="min-w-0 break-words">
                <span className="font-medium text-foreground/90">
                  {spec.label}:
                </span>{' '}
                {spec.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="surface-inset mb-4 min-w-0 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {floorAreaDisplay ?? t('home.showcase.openBidding')}
              </p>
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{t('home.showcase.activeBids')}</span>
              </p>
              <p className="text-sm font-bold text-foreground">
                {project.bid_count}
              </p>
            </div>
          </div>
          {postedDisplay && (
            <p className="mt-2 flex min-w-0 items-center gap-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {t('project.postedOn')} {postedDisplay}
              </span>
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full group/btn rounded-xl border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/10"
          asChild
        >
          <Link href={href}>
            <span>
              {action === 'bidNow' ? t('home.auctions.bidNow') : t('common.viewDetails')}
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

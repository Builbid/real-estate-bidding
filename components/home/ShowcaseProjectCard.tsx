'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { cn, formatRate, TRACK_LABELS } from '@/lib/utils';
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
  const { href, action } = getShowcaseCardAction(project.id, role);
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
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'border border-slate-200 bg-white text-slate-900',
        'dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:backdrop-blur',
        'transition-all duration-300 ease-in-out',
        'hover:-translate-y-1 hover:border-emerald-500/30',
      )}
    >
      <div className="border-b border-slate-200 px-5 pt-4 pb-4 dark:border-slate-800/80">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="emerald" className="text-xs">
              <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t('home.showcase.liveBadge')}
            </Badge>
            <Badge variant={isFirm ? 'violet' : 'amber'} className="text-xs">
              {getServiceBadgeLabel(serviceType)}
            </Badge>
            {finishingBadge && (
              <Badge className="text-xs border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {finishingBadge}
              </Badge>
            )}
            {!isFirm && (
              <Badge className="border-slate-200 bg-slate-100 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                {TRACK_LABELS[project.track_type]}
              </Badge>
            )}
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1',
              'border-slate-200 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/60',
              remaining.isUrgent &&
                'border-red-400/40 bg-red-50 dark:bg-red-950/40',
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
                'text-xs font-semibold tabular-nums tracking-tight',
                remaining.isUrgent
                  ? 'text-red-600 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-200',
              )}
            >
              {remaining.label}
            </span>
          </div>
        </div>

        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
          {project.title}
        </h3>

        {project.building_types && project.building_types.length > 0 && (
          <div className="mt-2">
            <BuildingConfigSummary project={project} compact />
          </div>
        )}

        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {specifications.map((spec) => (
            <li key={spec.label} className="flex gap-2">
              <span
                aria-hidden
                className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400"
              />
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-300">
                  {spec.label}:
                </span>{' '}
                {spec.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {floorAreaDisplay ?? t('home.showcase.openBidding')}
            </p>
          </div>
          <div>
            <p className="mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
              <Layers className="h-3 w-3" />
              {t('home.showcase.activeBids')}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {project.bid_count}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            'mt-auto w-full group/btn',
            'border-slate-200 bg-slate-50 text-slate-900',
            'hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-700',
            'dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100',
            'dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300',
          )}
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

'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, MapPin } from 'lucide-react';
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
  getServiceCategoryOption,
  getServiceHeadingClass,
  isFirmProject,
} from '@/lib/project/display';
import { DRAWING_TYPE_OPTIONS, isDrawingDesignServiceType } from '@/lib/drawingDesign';
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
  hideWhenExpired?: boolean;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/25 px-2 py-1.5 dark:bg-muted/15">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </p>
      <p className="text-xs font-semibold text-foreground tabular-nums truncate leading-tight">
        {value}
      </p>
    </div>
  );
}

function ShowcaseCountdownPill({
  remaining,
}: {
  remaining: ReturnType<typeof formatShowcaseRemaining>;
}) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border px-2 py-0.5',
        'bg-muted/30 border-border/70',
        remaining.isUrgent && 'border-red-400/40 bg-red-500/10',
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock
        className={cn(
          'h-3 w-3 shrink-0',
          remaining.isUrgent
            ? 'animate-pulse text-red-500'
            : 'text-emerald-600 dark:text-emerald-400',
        )}
      />
      <span
        className={cn(
          'truncate text-[11px] font-semibold tabular-nums',
          remaining.isUrgent ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-200',
        )}
      >
        {remaining.label}
      </span>
    </div>
  );
}

export function ShowcaseProjectCard({
  project,
  role,
  onExpire,
  hideWhenExpired = true,
}: ShowcaseProjectCardProps) {
  const { t } = useTranslation();
  const { href, action } = getShowcaseCardAction(project.id, role, { isDemo: project.isDemo });
  const [remaining, setRemaining] = useState(() =>
    formatShowcaseRemaining(project.bidding_ends_at),
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
        if (hideWhenExpired) {
          onExpire?.(project.id);
        }
      }
    }

    tick();
    interval = setInterval(tick, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project.bidding_ends_at, project.id, onExpire, hideWhenExpired]);

  if (hideWhenExpired && remaining.isExpired) return null;

  const isFirm = isFirmProject(project);
  const serviceType = getProjectServiceType(project);
  const serviceCategory = getServiceCategoryOption(serviceType);
  const floorAreaDisplay = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);
  const finishingBadge = getFinishingBadge(project.finishing_level);
  const postedDisplay = formatProjectPostedDisplay(project.created_at);

  const statCells: { label: string; value: string }[] = [
    {
      label: t('home.showcase.activeBids'),
      value: String(project.bid_count),
    },
    {
      label: t('home.showcase.leadingRate'),
      value: project.lowest_rate != null ? formatRate(project.lowest_rate) : '—',
    },
  ];

  if (floorAreaDisplay) {
    statCells.push({
      label: isFirm ? 'Floor Area' : t('home.showcase.specPlotSize'),
      value: floorAreaDisplay,
    });
  } else if (!isFirm) {
    statCells.push({
      label: t('home.showcase.specCategory'),
      value: TRACK_LABELS[project.track_type],
    });
  }

  if (budgetDisplay) {
    statCells.push({ label: 'Budget', value: budgetDisplay });
  } else if (isFirm && floorAreaDisplay) {
    statCells.push({
      label: t('home.showcase.specCategory'),
      value: getServiceBadgeLabel(serviceType),
    });
  }

  const displayStats = statCells.slice(0, 4);

  return (
    <article
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-xl',
        'border border-border/80 bg-card shadow-sm shadow-black/[0.03]',
        'transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/[0.05]',
        'dark:bg-card/80 dark:shadow-black/20 dark:ring-1 dark:ring-white/[0.05]',
      )}
    >
      <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <Badge variant="emerald" className="text-[10px] px-1.5 py-0">
              <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t('home.showcase.liveBadge')}
            </Badge>
            {finishingBadge && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                {finishingBadge}
              </Badge>
            )}
          </div>
          <ShowcaseCountdownPill remaining={remaining} />
        </div>

        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-bold tracking-tight leading-tight',
              getServiceHeadingClass(serviceType),
            )}
          >
            <span className="mr-1" aria-hidden>{serviceCategory.emoji}</span>
            {serviceCategory.label}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            {project.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
            <span className="truncate">
              {project.district}
              {project.state ? `, ${project.state}` : ''}
            </span>
          </p>
        </div>

        {isDrawingDesignServiceType(serviceType) &&
          project.drawing_types &&
          project.drawing_types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.drawing_types.map((dt) => {
                const opt = DRAWING_TYPE_OPTIONS.find((o) => o.value === dt);
                return (
                  <span
                    key={dt}
                    className="inline-flex items-center gap-0.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-1.5 py-0 text-[10px] font-semibold text-sky-800 dark:text-sky-200"
                  >
                    <span aria-hidden>{opt?.emoji}</span>
                    {opt?.label ?? dt}
                  </span>
                );
              })}
            </div>
          )}

        {project.building_types && project.building_types.length > 0 && (
          <div className="min-w-0">
            <BuildingConfigSummary
              project={project}
              compact
              hideConstructionTypes={isFirm}
              className="text-[11px] text-muted-foreground [&_p]:line-clamp-1"
            />
          </div>
        )}

        <dl className="grid grid-cols-2 gap-1.5">
          {displayStats.map((stat) => (
            <StatCell key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </dl>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {postedDisplay ? (
            <p className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">{postedDisplay}</span>
            </p>
          ) : (
            <span />
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-lg px-2.5 text-xs border-emerald-500/25 bg-emerald-500/[0.04] hover:bg-emerald-500/10"
            asChild
          >
            <Link href={href}>
              <span>{action === 'bidNow' ? t('home.auctions.bidNow') : t('common.viewDetails')}</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

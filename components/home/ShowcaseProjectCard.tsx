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
    <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-muted/15">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums truncate">{value}</p>
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
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border px-3 py-1',
        'bg-muted/30 border-border/70',
        remaining.isUrgent && 'border-red-400/40 bg-red-500/10',
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          remaining.isUrgent
            ? 'animate-pulse text-red-500'
            : 'text-emerald-600 dark:text-emerald-400',
        )}
      />
      <span
        className={cn(
          'truncate text-xs font-semibold tabular-nums',
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
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl',
        'border border-border/80 bg-card shadow-sm shadow-black/[0.03]',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/[0.06]',
        'dark:bg-card/80 dark:shadow-black/20 dark:ring-1 dark:ring-white/[0.05]',
      )}
    >
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 space-y-2">
          <div className="flex sm:hidden"><ShowcaseCountdownPill remaining={remaining} /></div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge variant="emerald" className="text-[11px]">
                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {t('home.showcase.liveBadge')}
              </Badge>
              {finishingBadge && (
                <Badge variant="default" className="text-[11px]">
                  {finishingBadge}
                </Badge>
              )}
            </div>
            <div className="hidden sm:flex"><ShowcaseCountdownPill remaining={remaining} /></div>
          </div>
          <p
            className={cn(
              'text-xl font-extrabold tracking-tight leading-tight sm:text-2xl',
              getServiceHeadingClass(serviceType),
            )}
          >
            <span className="mr-1.5" aria-hidden>{serviceCategory.emoji}</span>
            {serviceCategory.label}
          </p>
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:text-lg">
          {project.title}
        </h3>

        <p className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
          <span className="truncate">
            {project.district}
            {project.state ? `, ${project.state}` : ''}
          </span>
        </p>

        {isDrawingDesignServiceType(serviceType) &&
          project.drawing_types &&
          project.drawing_types.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {project.drawing_types.map((dt) => {
                const opt = DRAWING_TYPE_OPTIONS.find((o) => o.value === dt);
                return (
                  <span
                    key={dt}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:text-sky-200"
                  >
                    <span aria-hidden>{opt?.emoji}</span>
                    {opt?.label ?? dt}
                  </span>
                );
              })}
            </div>
          )}

        {project.building_types && project.building_types.length > 0 && (
          <div className="mb-4 min-w-0">
            <BuildingConfigSummary
              project={project}
              compact
              hideConstructionTypes={isFirm}
              className="text-xs text-muted-foreground"
            />
          </div>
        )}

        <dl className="mb-4 grid flex-1 grid-cols-2 gap-2 sm:gap-2.5">
          {displayStats.map((stat) => (
            <StatCell key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </dl>

        {postedDisplay && (
          <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {t('project.postedOn')} {postedDisplay}
            </span>
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full rounded-xl border-emerald-500/25 bg-emerald-500/[0.04] hover:bg-emerald-500/10"
          asChild
        >
          <Link href={href}>
            <span>{action === 'bidNow' ? t('home.auctions.bidNow') : t('common.viewDetails')}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock,
  DraftingCompass,
  HardHat,
  MapPin,
  Palette,
  Wrench,
  Zap,
} from 'lucide-react';
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
  isFirmProject,
  isTradeProject,
} from '@/lib/project/display';
import { DRAWING_TYPE_OPTIONS, isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { getProjectWorkRequirementBlocks, isFloorFixtureRequirementLabel } from '@/lib/project/workRequirements';
import {
  formatFloorSummary,
  getProjectBuiltUpAreaLabel,
  isFloorScopeRequirementLabel,
} from '@/lib/project/formatFloorSummary';
import { FloorScopeBadges } from '@/components/project/FloorScopeBadges';
import { CheckLocationLink } from '@/components/project/ProjectLocationWithMapsLink';
import { earthworkCardLocation, earthworkSpecificDetailsText } from '@/lib/validation/earthworkLocation';
import {
  formatShowcaseRemaining,
  getShowcaseCardAction,
  isProjectSelectionWindow,
  type ShowcaseProject,
} from '@/lib/projectShowcase';
import { getLiveAuctionDisplayTitle } from '@/lib/generateProjectTitle';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { useProfile } from '@/lib/hooks/useProfile';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ServiceType } from '@/lib/types';

interface ShowcaseProjectCardProps {
  project: ShowcaseProject;
  role: string | null;
  onExpire?: (projectId: string) => void;
  hideWhenExpired?: boolean;
}

const CARD_ICON_SHELL = 'bg-brand/10 text-brand dark:bg-slate-800 dark:text-brand';
const CARD_BADGE =
  'inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
const CARD_ACCENT_BAR = 'bg-brand';

function getServiceIcon(serviceType: ServiceType) {
  if (serviceType === 'construction_firm') return Building2;
  if (isDrawingDesignServiceType(serviceType)) return DraftingCompass;
  if (serviceType === 'painter') return Palette;
  if (serviceType === 'electrician') return Zap;
  if (isTradeProject({ service_type: serviceType })) return Wrench;
  return HardHat;
}

function BlueprintPattern({
  className,
  patternId,
}: {
  className?: string;
  patternId: string;
}) {
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden
    >
      <defs>
        <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M12 0H0V12"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

function StatCell({
  label,
  value,
  accentClass,
  allowWrap = false,
  className,
}: {
  label: string;
  value: string;
  accentClass: string;
  allowWrap?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/60',
        className,
      )}
    >
      <span className={cn('absolute inset-y-1.5 left-0 w-0.5 rounded-full', accentClass)} />
      <p className="pl-1.5 text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
        {label}
      </p>
      <p
        className={cn(
          'pl-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight break-words',
          allowWrap ? 'line-clamp-2' : 'truncate tabular-nums',
          (label === 'Additional Requirements' || label === 'Additional Notes') &&
            'line-clamp-3 font-medium',
          label === 'Civil Work Type' && 'line-clamp-3',
        )}
      >
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
        'bg-background/80 border-border/70 backdrop-blur-sm',
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
            : 'text-brand',
        )}
      />
      <span
        className={cn(
          'truncate text-[11px] font-semibold tabular-nums',
          remaining.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-brand',
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
  const { profile } = useProfile();
  const patternUid = useId().replace(/:/g, '');
  const effectiveRole = profile?.role ?? role;
  const workerServiceType = profile?.service_type ?? null;
  const { href, action } = getShowcaseCardAction(project.id, effectiveRole, {
    isDemo: project.isDemo,
    project,
    workerServiceType,
  });
  const [remaining, setRemaining] = useState(() =>
    formatShowcaseRemaining(project.bidding_ends_at),
  );
  const expiredRef = useRef(false);
  const biddingClosed = isProjectSelectionWindow(project) || remaining.isExpired;
  const cardAction = biddingClosed ? 'viewDetails' : action;
  const cardHref = biddingClosed ? `/project/${project.id}` : href;

  useEffect(() => {
    expiredRef.current = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    function tick() {
      const next = formatShowcaseRemaining(project.bidding_ends_at);
      setRemaining(next);

      const selectionEnded = project.selection_ends_at
        ? new Date(project.selection_ends_at).getTime() <= Date.now()
        : false;
      const leaveGrid = next.isExpired && selectionEnded;

      if (leaveGrid && !expiredRef.current) {
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
  }, [project.bidding_ends_at, project.selection_ends_at, project.id, onExpire, hideWhenExpired]);

  const selectionEnded = project.selection_ends_at
    ? new Date(project.selection_ends_at).getTime() <= Date.now()
    : false;
  if (hideWhenExpired && remaining.isExpired && selectionEnded) return null;

  const isFirm = isFirmProject(project);
  const serviceType = getProjectServiceType(project);
  const serviceCategory = getServiceCategoryOption(serviceType);
  const ServiceIcon = getServiceIcon(serviceType);
  const floorAreaDisplay = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);
  const finishingBadge = getFinishingBadge(project.finishing_level);
  const postedDisplay = formatProjectPostedDisplay(project.created_at);
  const floorScopes = formatFloorSummary(project);
  const builtUpLabel = getProjectBuiltUpAreaLabel(project);
  const filteredRequirementBlocks =
    (getProjectWorkRequirementBlocks(project)?.blocks ?? null)?.filter(
      (block) =>
        block.label !== 'Calculated Total Floor Area' &&
        !isFloorFixtureRequirementLabel(block.label) &&
        !(floorScopes.length > 0 && isFloorScopeRequirementLabel(block.label)),
    ) ?? null;
  const requirementBlocks =
    filteredRequirementBlocks && filteredRequirementBlocks.length > 0
      ? filteredRequirementBlocks
      : null;
  const earthworkLocation = earthworkCardLocation(project);
  const specificDetails = earthworkSpecificDetailsText(project.description, earthworkLocation);

  const statCells: { label: string; value: string }[] = requirementBlocks
    ? requirementBlocks
    : [
        {
          label: t('home.showcase.activeBids'),
          value: String(project.bid_count),
        },
        {
          label: t('home.showcase.leadingRate'),
          value: project.lowest_rate != null ? formatRate(project.lowest_rate) : '—',
        },
      ];

  if (!requirementBlocks) {
    if (builtUpLabel || floorAreaDisplay) {
      statCells.push({
        label: isFirm ? 'Floor Area' : t('home.showcase.specPlotSize'),
        value: builtUpLabel ?? floorAreaDisplay!,
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
  }

  const displayStats = requirementBlocks ? statCells : statCells.slice(0, 4);

  let metaBlock: ReactNode = null;
  if (
    isDrawingDesignServiceType(serviceType) &&
    project.drawing_types &&
    project.drawing_types.length > 0
  ) {
    metaBlock = (
      <div className="flex flex-wrap gap-1">
        {project.drawing_types.map((dt) => {
          const opt = DRAWING_TYPE_OPTIONS.find((o) => o.value === dt);
          return (
            <span
              key={dt}
              className={CARD_BADGE}
            >
              <span aria-hidden>{opt?.emoji}</span>
              {opt?.label ?? dt}
            </span>
          );
        })}
      </div>
    );
  } else if (floorScopes.length > 0) {
    metaBlock = (
      <div className="space-y-1.5">
        <FloorScopeBadges
          items={floorScopes}
          badgeClassName="border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
        />
        {specificDetails ? (
          <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Specific Details
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-900 dark:text-slate-100">
              {specificDetails}
            </p>
          </div>
        ) : null}
      </div>
    );
  } else if (requirementBlocks && specificDetails) {
    metaBlock = (
      <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Specific Details
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-900 dark:text-slate-100">
          {specificDetails}
        </p>
      </div>
    );
  } else if (!requirementBlocks && project.building_types && project.building_types.length > 0) {
    metaBlock = (
      <div className="min-w-0">
        <BuildingConfigSummary
          project={project}
          compact
          hideConstructionTypes={isFirm}
          className="text-[11px] text-muted-foreground [&_p]:line-clamp-1"
        />
      </div>
    );
  }

  return (
    <article
      className="group relative flex h-full w-full min-w-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col gap-2 p-3 pl-3.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <Badge className={cn(
              'px-1.5 py-0 text-[10px]',
              biddingClosed
                ? 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200'
                : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
            )}>
              {biddingClosed ? (
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-violet-500" />
              ) : (
                <span className="relative mr-1 inline-flex h-1.5 w-1.5 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#22c55e]" />
                </span>
              )}
              {biddingClosed ? t('home.showcase.selectionBadge') : t('home.showcase.liveBadge')}
            </Badge>
            {finishingBadge && (
              <Badge className="border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {finishingBadge}
              </Badge>
            )}
          </div>
          {biddingClosed ? (
            <span className="inline-flex max-w-full shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
              {t('home.showcase.biddingFrozen')}
            </span>
          ) : (
            <ShowcaseCountdownPill remaining={remaining} />
          )}
        </div>

        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              CARD_ICON_SHELL,
            )}
          >
            <BlueprintPattern
              patternId={`bb-icon-${patternUid}`}
              className="rounded-xl text-current opacity-20"
            />
            <ServiceIcon className="relative h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight leading-tight text-slate-900 dark:text-slate-100">
              {serviceCategory.label}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100">
              {getLiveAuctionDisplayTitle(project)}
            </h3>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="h-3 w-3 shrink-0 opacity-80" />
              <span className="truncate">
                {project.district}
                {project.state ? `, ${project.state}` : ''}
              </span>
              <CheckLocationLink
                placeName={earthworkLocation?.address ?? [project.district, project.state].filter(Boolean).join(', ')}
                pincode={project.pincode}
                mapsQuery={earthworkLocation?.mapsQuery}
                className="ml-1"
              />
            </p>
          </div>
        </div>

        {requirementBlocks ? (
          <>
            <dl className="grid grid-cols-2 gap-1.5">
              {displayStats.map((stat) => (
                <StatCell
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  accentClass={CARD_ACCENT_BAR}
                  allowWrap
                  className={
                    stat.label === 'Additional Requirements' ||
                    stat.label === 'Additional Notes' ||
                    stat.label === 'Civil Work Type'
                      ? 'col-span-2'
                      : undefined
                  }
                />
              ))}
            </dl>
            {metaBlock}
          </>
        ) : (
          <>
            {metaBlock}
            <dl className="grid grid-cols-2 gap-1.5">
              {displayStats.map((stat) => (
                <StatCell
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  accentClass={CARD_ACCENT_BAR}
                />
              ))}
            </dl>
          </>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          {postedDisplay ? (
            <p className="flex min-w-0 items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">{postedDisplay}</span>
            </p>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            className="h-8 shrink-0 rounded-lg border-0 bg-brand px-2.5 text-xs font-medium text-white shadow-none hover:bg-brand-hover hover:text-white dark:bg-brand dark:text-white dark:hover:bg-brand-hover"
            asChild
          >
            <Link href={cardHref}>
              <span>{cardAction === 'bidNow' ? t('home.auctions.bidNow') : t('common.viewDetails')}</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

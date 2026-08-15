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
  getServiceHeadingClass,
  isFirmProject,
  isTradeProject,
} from '@/lib/project/display';
import { DRAWING_TYPE_OPTIONS, isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { getProjectWorkRequirementBlocks } from '@/lib/project/workRequirements';
import {
  formatShowcaseRemaining,
  getShowcaseCardAction,
  type ShowcaseProject,
} from '@/lib/projectShowcase';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ServiceType } from '@/lib/types';

interface ShowcaseProjectCardProps {
  project: ShowcaseProject;
  role: string | null;
  onExpire?: (projectId: string) => void;
  hideWhenExpired?: boolean;
}

type CardTheme = {
  strip: string;
  wash: string;
  orb: string;
  iconShell: string;
  accentBar: string;
  hoverBorder: string;
  Icon: typeof HardHat;
};

function getCardTheme(serviceType: ServiceType): CardTheme {
  if (serviceType === 'construction_firm') {
    return {
      strip: 'from-violet-600 via-indigo-500 to-violet-700',
      wash: 'from-violet-500/[0.12] via-transparent to-transparent',
      orb: 'bg-violet-400/25',
      iconShell:
        'bg-violet-500/15 border-violet-400/35 text-violet-700 dark:text-violet-200',
      accentBar: 'bg-violet-500',
      hoverBorder: 'hover:border-violet-500/35',
      Icon: Building2,
    };
  }
  if (isDrawingDesignServiceType(serviceType)) {
    return {
      strip: 'from-sky-600 via-cyan-500 to-sky-700',
      wash: 'from-sky-500/[0.12] via-transparent to-transparent',
      orb: 'bg-sky-400/25',
      iconShell: 'bg-sky-500/15 border-sky-400/35 text-sky-700 dark:text-sky-200',
      accentBar: 'bg-sky-500',
      hoverBorder: 'hover:border-sky-500/35',
      Icon: DraftingCompass,
    };
  }
  if (isTradeProject({ service_type: serviceType })) {
    const tradeTheme = {
      strip: 'from-teal-600 via-emerald-500 to-teal-700',
      wash: 'from-teal-500/[0.12] via-transparent to-transparent',
      orb: 'bg-teal-400/25',
      iconShell: 'bg-teal-500/15 border-teal-400/35 text-teal-700 dark:text-teal-200',
      accentBar: 'bg-teal-500',
      hoverBorder: 'hover:border-teal-500/35',
    } as const;

    if (serviceType === 'painter') {
      return { ...tradeTheme, Icon: Palette };
    }
    if (serviceType === 'electrician') {
      return { ...tradeTheme, Icon: Zap };
    }

    return {
      ...tradeTheme,
      Icon: Wrench,
    };
  }
  return {
    strip: 'from-amber-600 via-orange-500 to-amber-700',
    wash: 'from-amber-500/[0.14] via-transparent to-transparent',
    orb: 'bg-amber-400/30',
    iconShell:
      'bg-amber-500/15 border-amber-400/40 text-amber-800 dark:text-amber-200',
    accentBar: 'bg-amber-500',
    hoverBorder: 'hover:border-amber-500/40',
    Icon: HardHat,
  };
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
        'relative overflow-hidden rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 dark:bg-muted/10',
        className,
      )}
    >
      <span className={cn('absolute inset-y-1.5 left-0 w-0.5 rounded-full', accentClass)} />
      <p className="pl-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </p>
      <p
        className={cn(
          'pl-1.5 text-xs font-semibold text-foreground leading-tight break-words',
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
  const patternUid = useId().replace(/:/g, '');
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
  const theme = getCardTheme(serviceType);
  const ServiceIcon = theme.Icon;
  const floorAreaDisplay = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);
  const finishingBadge = getFinishingBadge(project.finishing_level);
  const postedDisplay = formatProjectPostedDisplay(project.created_at);
  const requirementBlocks = getProjectWorkRequirementBlocks(project)?.blocks ?? null;

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
              className="inline-flex items-center gap-0.5 rounded-md border border-sky-500/25 bg-sky-500/10 px-1.5 py-0 text-[10px] font-semibold text-sky-800 dark:text-sky-200"
            >
              <span aria-hidden>{opt?.emoji}</span>
              {opt?.label ?? dt}
            </span>
          );
        })}
      </div>
    );
  } else if (requirementBlocks && project.description?.trim()) {
    metaBlock = (
      <div className="min-w-0 rounded-lg border border-border/50 bg-muted/15 px-2 py-1.5">
        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          Specific Details
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-foreground/90">
          {project.description.trim()}
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
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-xl',
        'border border-border/80 bg-card shadow-sm shadow-black/[0.03]',
        'transition-all duration-200 hover:shadow-md',
        theme.hoverBorder,
        'dark:bg-card/80 dark:shadow-black/20 dark:ring-1 dark:ring-white/[0.05]',
      )}
    >
      {/* Service-colored top band with blueprint grid */}
      <div className={cn('relative h-1.5 bg-gradient-to-r', theme.strip)}>
        <BlueprintPattern
          patternId={`bb-strip-${patternUid}`}
          className="text-white/25"
        />
      </div>

      {/* Soft graphic wash + orbs (no extra layout height) */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100',
          theme.wash,
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl',
          theme.orb,
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute -bottom-10 -left-8 h-20 w-20 rounded-full blur-2xl opacity-70',
          theme.orb,
        )}
        aria-hidden
      />
      <span
        className={cn('absolute inset-y-0 left-0 w-[3px]', theme.accentBar)}
        aria-hidden
      />

      {/* Large watermark icon */}
      <ServiceIcon
        className="pointer-events-none absolute -right-1 top-6 h-20 w-20 rotate-12 text-foreground/[0.04] dark:text-white/[0.05]"
        strokeWidth={1.25}
        aria-hidden
      />

      <div className="relative flex flex-col gap-2 p-3 pl-3.5">
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

        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm',
              theme.iconShell,
            )}
          >
            <BlueprintPattern
              patternId={`bb-icon-${patternUid}`}
              className="rounded-xl text-current opacity-20"
            />
            <ServiceIcon className="relative h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm font-bold tracking-tight leading-tight',
                getServiceHeadingClass(serviceType),
              )}
            >
              {serviceCategory.label}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
              {project.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 opacity-80" />
              <span className="truncate">
                {project.district}
                {project.state ? `, ${project.state}` : ''}
              </span>
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
                  accentClass={theme.accentBar}
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
                  accentClass={theme.accentBar}
                />
              ))}
            </dl>
          </>
        )}

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

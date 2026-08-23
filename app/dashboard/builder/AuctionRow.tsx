'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { TRACK_LABELS, formatProjectPostedAt } from '@/lib/utils';
import { isTradeServiceType } from '@/lib/trades';
import {
  getProjectConfigOrDrawingMeta,
  getProjectServiceBadgeLabel,
} from '@/lib/project/display';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { formatBidUnitSuffix } from '@/lib/bid/earthworkBid';
import {
  getWorkerBidHref,
  getWorkerProjectViewHref,
} from '@/lib/bid/workerBidEligibility';
import { useTranslation } from '@/lib/context/LanguageProvider';
import type { Project, Bid } from '@/lib/types';

interface AuctionRowProps {
  project: Project;
  myBid?: Bid;
  /** When false, row opens read-only project details instead of the bid console. */
  canBid?: boolean;
  bidHrefOverride?: string;
}

export function AuctionRow({
  project,
  myBid,
  canBid = true,
  bidHrefOverride,
}: AuctionRowProps) {
  const { t } = useTranslation();
  const countdown = useCountdown(project.bidding_ends_at);
  const router = useRouter();

  const hasBid = !!myBid;
  const isExpired = countdown.isExpired;
  const bidHref = bidHrefOverride ?? getWorkerBidHref('labour_contractor', project.id);
  const viewHref = getWorkerProjectViewHref(project.id);
  const destinationHref = canBid ? bidHref : viewHref;
  const isTrade = isTradeServiceType(project.service_type);
  const isDrawing = isDrawingDesignServiceType(project.service_type);
  const serviceBadge = getProjectServiceBadgeLabel(project);
  const configLabel = getProjectConfigOrDrawingMeta(project);
  const postedAt = formatProjectPostedAt(project.created_at);

  const ctaLabel = isExpired
    ? hasBid && canBid
      ? 'Update Bid'
      : canBid
        ? t('home.auctions.bidNow')
        : t('common.viewDetails')
    : hasBid && canBid
      ? 'Update Bid'
      : canBid
        ? t('home.auctions.bidNow')
        : t('common.viewDetails');

  return (
    <div
      onClick={() => router.push(destinationHref)}
      className={`flex items-center gap-4 p-4 rounded-xl border bg-card/80 dark:bg-card/60 hover:border-border transition-colors cursor-pointer ${
        hasBid && canBid ? 'border-indigo-500/30' : 'border-border'
      }`}
    >
      {/* Project info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {!isExpired && (
            <Badge variant="emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </Badge>
          )}
          <Badge>{serviceBadge}</Badge>
          {isTrade && !isDrawing && (
            <Badge>{TRACK_LABELS[project.track_type]}</Badge>
          )}
          {hasBid && canBid && (
            <Badge variant="indigo">
              Your Bid: ₹{myBid!.total_sum_metric.toLocaleString('en-IN')}{formatBidUnitSuffix(myBid!.rates, undefined, project.service_type)}
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">{project.district}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">{configLabel}</span>
          {postedAt && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Posted {postedAt}
              </span>
            </>
          )}
        </div>

        {/* Countdown — mobile only, shown inline under project meta */}
        <div className="flex sm:hidden items-center gap-2 mt-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
          <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
        </div>
      </div>

      {/* Countdown — desktop only */}
      <div className="hidden sm:flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
        <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
      </div>

      {/* CTA — stop propagation only when active so the card click still fires when expired */}
      <div onClick={(e) => { if (!isExpired) e.stopPropagation(); }}>
        {isExpired ? (
          <Button size="sm" variant={hasBid && canBid ? 'outline' : 'default'} disabled>
            {ctaLabel}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" variant={hasBid && canBid ? 'outline' : 'default'} asChild>
            <Link href={destinationHref}>
              {ctaLabel}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

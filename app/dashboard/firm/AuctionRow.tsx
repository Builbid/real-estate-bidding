'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { useCountdown } from '@/lib/hooks/useCountdown';
import {
  getFinishingBadge,
  getProjectBudgetDisplay,
  getProjectFloorAreaDisplay,
} from '@/lib/project/display';
import { formatBidRatePerSqft } from '@/lib/firm/bidDisplay';
import { formatProjectPostedAt } from '@/lib/utils';
import type { Project, Bid } from '@/lib/types';

interface FirmAuctionRowProps {
  project: Project;
  myBid?: Bid;
}

export function FirmAuctionRow({ project, myBid }: FirmAuctionRowProps) {
  const countdown = useCountdown(project.bidding_ends_at);
  const router = useRouter();

  const hasBid = !!myBid;
  const isExpired = countdown.isExpired;
  const hasProjectId = Boolean(project?.id);
  const bidHref = hasProjectId ? `/dashboard/firm/bid/${project.id}` : '/dashboard/firm';
  const finishingBadge = getFinishingBadge(project.finishing_level);
  const floorArea = getProjectFloorAreaDisplay(project);
  const budget = getProjectBudgetDisplay(project);
  const postedAt = formatProjectPostedAt(project.created_at);

  function handleRowClick() {
    if (!hasProjectId) {
      console.error('FirmAuctionRow: project.id is missing — cannot open bid page');
      return;
    }
    router.push(bidHref);
  }

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center gap-4 p-4 rounded-xl border bg-card/80 dark:bg-card/60 hover:border-violet-500/30 transition-colors ${
        hasProjectId ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
      } ${hasBid ? 'border-violet-500/30' : 'border-border'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {!isExpired && (
            <Badge variant="emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </Badge>
          )}
          {finishingBadge && (
            <Badge className="text-[10px] border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {finishingBadge}
            </Badge>
          )}
          {hasBid && (
            <Badge variant="violet">
              Your Bid: {formatBidRatePerSqft(myBid!)}
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
        {project.building_types && project.building_types.length > 0 && (
          <div className="mt-1">
            <BuildingConfigSummary project={project} compact />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <span>{project.district}</span>
          {floorArea && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>{floorArea}</span>
            </>
          )}
          {budget && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>{budget}</span>
            </>
          )}
          {postedAt && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Posted {postedAt}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
        <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
      </div>

      <div onClick={(e) => { if (!isExpired) e.stopPropagation(); }}>
        {isExpired || !hasProjectId ? (
          <Button size="sm" variant={hasBid ? 'outline' : 'default'} disabled>
            {hasBid ? 'Update Bid' : 'Place Bid'}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" variant={hasBid ? 'outline' : 'default'} className="bg-emerald-600 hover:bg-emerald-500" asChild>
            <Link href={bidHref}>
              {hasBid ? 'Update Bid' : 'Place Bid'}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

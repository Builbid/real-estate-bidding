'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { useCountdown } from '@/lib/hooks/useCountdown';
import {
  getFinishingBadge,
  getProjectBudgetDisplay,
  getProjectFloorAreaDisplay,
} from '@/lib/project/display';
import { formatPackageRateRange } from '@/lib/firm/bidDisplay';
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

  const statusParts = [
    !isExpired ? 'Live' : null,
    finishingBadge,
    hasBid ? `Your Bid: ${formatPackageRateRange(myBid!.package_rates) ?? '—'}` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center gap-4 py-4 transition-opacity ${
        hasProjectId ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-70'
      }`}
    >
      <div className="flex-1 min-w-0">
        {statusParts.length > 0 ? (
          <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            {statusParts.map((part, index) => (
              <span key={`${part}-${index}`}>
                {index > 0 ? <span className="text-gray-400"> · </span> : null}
                <span className={index === 0 && !isExpired ? 'text-emerald-700 dark:text-emerald-400' : undefined}>
                  {part}
                </span>
              </span>
            ))}
          </p>
        ) : null}
        <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
        {project.building_types && project.building_types.length > 0 && (
          <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            {project.building_types.join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <span>{project.district}</span>
          {floorArea && (
            <>
              <span className="text-muted-foreground">·</span>
              <span>{floorArea}</span>
            </>
          )}
          {budget && (
            <>
              <span className="text-muted-foreground">·</span>
              <span>{budget}</span>
            </>
          )}
          {postedAt && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Posted {postedAt}
              </span>
            </>
          )}
        </div>

        {/* Countdown — mobile only, shown inline under project meta */}
        <div className="flex sm:hidden items-center gap-2 mt-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
        </div>
      </div>

      {/* Countdown — desktop only */}
      <div className="hidden sm:flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
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

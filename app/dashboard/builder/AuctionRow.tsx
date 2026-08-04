'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { CalendarDays } from 'lucide-react';
import { TRACK_LABELS, getConstructionLabel, formatProjectPostedAt } from '@/lib/utils';
import type { Project, Bid } from '@/lib/types';

interface AuctionRowProps {
  project: Project;
  myBid?: Bid;
}

export function AuctionRow({ project, myBid }: AuctionRowProps) {
  const countdown = useCountdown(project.bidding_ends_at);
  const router = useRouter();

  const hasBid = !!myBid;
  const isExpired = countdown.isExpired;
  const bidHref = `/dashboard/builder/bid/${project.id}`;

  const configLabel = getConstructionLabel(project.track_type, project.sub_configuration);
  const postedAt = formatProjectPostedAt(project.created_at);

  return (
    <div
      onClick={() => router.push(bidHref)}
      className={`flex items-center gap-4 p-4 rounded-xl border bg-card/80 dark:bg-card/60 hover:border-border transition-colors cursor-pointer ${
        hasBid ? 'border-indigo-500/30' : 'border-border'
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
          <Badge>{TRACK_LABELS[project.track_type]}</Badge>
          {hasBid && (
            <Badge variant="indigo">
              Your Bid: ₹{myBid!.total_sum_metric.toLocaleString('en-IN')}/sqft
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
          <Button size="sm" variant={hasBid ? 'outline' : 'default'} disabled>
            {hasBid ? 'Update Bid' : 'Place Bid'}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" variant={hasBid ? 'outline' : 'default'} asChild>
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

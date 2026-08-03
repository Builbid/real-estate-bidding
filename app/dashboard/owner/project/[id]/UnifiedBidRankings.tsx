'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, UserCheck, Trophy, TrendingDown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeBids } from '@/lib/hooks/useRealtimeBids';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BuilderRatingBadge } from '@/components/shared/BuilderRatingBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { computeRatingStats } from '@/lib/builderRatings';
import { BuilderPortfolioModal } from './BuilderPortfolioModal';
import { SelectBuilderButton } from './SelectBuilderButton';
import { BidFloorRatesBreakdown } from '@/components/shared/BidFloorRatesBreakdown';
import { hasMultiFloorBidRates } from '@/lib/bid/floorRateDisplay';
import { useOwnerProjectPhaseContext } from '@/lib/context/OwnerProjectPhaseContext';
import type { Project, Bid } from '@/lib/types';

interface BuilderInfo {
  id: string;
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
}

interface Props {
  initialBids: Bid[];
  initialBuilders: Record<string, BuilderInfo>;
  userId: string;
}

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export function UnifiedBidRankings({
  initialBids, initialBuilders, userId,
}: Props) {
  const { project, isReveal, isFrozen } = useOwnerProjectPhaseContext();
  const supabase = createClient();
  const { bids: realtimeBids, loading } = useRealtimeBids(project.id);

  const [builders, setBuilders] = useState<Record<string, BuilderInfo>>(initialBuilders);
  const [ratings, setRatings]   = useState<Record<string, { average: number; total: number }>>({});

  // Use realtime bids when available, fall back to server-fetched initial
  const bids = realtimeBids.length > 0 ? realtimeBids : initialBids;

  // Fetch profiles for any builder IDs not yet in the map (new realtime bids)
  useEffect(() => {
    const missingIds = bids
      .filter((b) => b.builder_id && !builders[b.builder_id])
      .map((b) => b.builder_id as string);

    if (missingIds.length === 0) return;

    supabase
      .from('profiles_public')
      .select('id, full_name, is_verified, avatar_url, created_at')
      .in('id', missingIds)
      .then(({ data }) => {
        if (data) {
          setBuilders((prev) => ({
            ...prev,
            ...Object.fromEntries((data as BuilderInfo[]).map((p) => [p.id, p])),
          }));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids]);

  // Fetch average star ratings for all builders in this bid list
  useEffect(() => {
    const builderIds = bids.map((b) => b.builder_id).filter(Boolean) as string[];
    if (builderIds.length === 0) return;

    supabase
      .from('builder_ratings')
      .select('builder_id, rating')
      .in('builder_id', builderIds)
      .then(({ data }) => {
        if (!data) return;
        const acc: Record<string, { rating: number }[]> = {};
        data.forEach((r: { builder_id: string; rating: number }) => {
          if (!acc[r.builder_id]) acc[r.builder_id] = [];
          acc[r.builder_id].push({ rating: r.rating });
        });
        setRatings(
          Object.fromEntries(
            Object.entries(acc).map(([id, rows]) => {
              const stats = computeRatingStats(rows);
              return [id, { average: stats.average, total: stats.total }];
            })
          )
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids]);

  if (loading && bids.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading bids…</span>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Trophy className="w-10 h-10 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-semibold text-foreground">No bids yet</p>
          <p className="text-xs text-muted-foreground mt-1">Bids will appear here in real time as builders submit them.</p>
        </div>
      </div>
    );
  }

  const isCompleted = project.status === 'completed';
  const showFloorBreakdown = project.status !== 'active_24h';

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bid Rankings — {bids.length} bid{bids.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!isCompleted && !isFrozen && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {bids.map((bid, index) => {
          const builder    = builders[bid.builder_id ?? ''];
          const ratingInfo = ratings[bid.builder_id ?? ''];
          const starAverage = ratingInfo?.average ?? 0;
          const starTotal   = ratingInfo?.total ?? 0;
          const isSelected = project.selected_builder_id === bid.builder_id;
          const isLowest   = index === 0;
          const isMe       = bid.builder_id === userId;

          return (
            <motion.div
              key={bid.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`relative flex flex-wrap items-center gap-x-4 gap-y-2 p-4 rounded-xl border transition-colors ${
                isSelected
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : isLowest
                  ? 'border-indigo-500/30 bg-indigo-500/5'
                  : 'border-border bg-card/80 dark:bg-card/60'
              }`}
            >
              {/* Top green line for lowest bid */}
              {isLowest && !isSelected && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-xl" />
              )}

              {/* Rank */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold ${
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : index === 0
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : index === 1
                  ? 'bg-muted/50 border-border/30 text-foreground/80'
                  : index === 2
                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                  : 'bg-secondary border-border text-muted-foreground'
              }`}>
                {RANK_MEDAL[index] ?? index + 1}
              </div>

              {/* Builder identity + stars */}
              <UserAvatar
                name={builder?.full_name ?? (bid.builder_id ? `Builder #${bid.builder_id.slice(-6).toUpperCase()}` : 'Builder')}
                avatarUrl={builder?.avatar_url}
                size="md"
                gradient={isMe ? 'from-indigo-500 to-violet-600' : 'from-emerald-500 to-teal-600'}
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                {builder ? (
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{builder.full_name}</p>
                      {builder.is_verified && (
                        <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ✓ Verified
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <BuilderRatingBadge
                        average={starAverage}
                        total={starTotal}
                        size="xs"
                        showCount={starTotal > 0}
                      />
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-[10px] text-muted-foreground/80">{formatRelativeTime(bid.created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {bid.builder_id ? `Builder #${bid.builder_id.slice(-6).toUpperCase()}` : 'Builder'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{formatRelativeTime(bid.created_at)}</p>
                  </div>
                )}
              </div>

              {/* Rate */}
              <div className="text-right flex-shrink-0 min-w-[5.5rem]">
                <p className={`text-base font-bold tabular-nums ${
                  isSelected ? 'text-emerald-400' : isLowest ? 'text-emerald-400' : 'text-foreground'
                }`}>
                  ₹{bid.total_sum_metric.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-muted-foreground">total /sqft</p>
              </div>

              {showFloorBreakdown && hasMultiFloorBidRates(bid.rates) && (
                <div className="w-full basis-full">
                  <BidFloorRatesBreakdown rates={bid.rates} />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View portfolio button — always visible post-close */}
                {isReveal && builder && bid.builder_id && (
                  <BuilderPortfolioModal
                    builder={{ ...builder, id: bid.builder_id }}
                    bid={bid}
                    rank={index + 1}
                    currentProjectId={project.id}
                    isProjectCompleted={isCompleted}
                    isSelectedBuilder={isSelected}
                    ownerId={userId}
                  />
                )}

                {/* Select builder — shown during frozen phase if no winner yet */}
                {isFrozen && !project.selected_builder_id && bid.builder_id && (
                  <SelectBuilderButton
                    projectId={project.id}
                    builderId={bid.builder_id}
                    builderName={builder?.full_name}
                  />
                )}

                {/* Selected badge */}
                {isSelected && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Selected</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingDown, EyeOff, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeBids } from '@/lib/hooks/useRealtimeBids';
import { useProfile } from '@/lib/hooks/useProfile';
import { BuilderRatingBadge } from '@/components/shared/BuilderRatingBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { computeRatingStats } from '@/lib/builderRatings';
import { cn, formatRelativeTime, getFloorInputCount, averageFromSumMetric, formatBidMetric } from '@/lib/utils';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { ConstructionMatrixSummary } from '@/components/construction/ConstructionMatrixSummary';
import { BidFloorRatesBreakdown } from '@/components/shared/BidFloorRatesBreakdown';
import { shouldShowBidFloorBreakdown } from '@/lib/bid/floorRateDisplay';
import { resolveScopeRateBidItems } from '@/lib/bid/scopeRateBid';
import { getServiceBidderLabels } from '@/lib/project/display';
import { getPlumbingUnitRateDisplayEntries, readProjectPlumbingBidOptions } from '@/lib/plumberBid';
import { getElectricianUnitRateDisplayEntries, readProjectElectricianBidOptions } from '@/lib/electricianBid';
import { getInteriorUnitRateDisplayEntries, readProjectInteriorBidOptions } from '@/lib/interiorBid';
import type { ProjectStatus, ServiceType, TrackType, SubConfiguration } from '@/lib/types';

interface BuilderInfo {
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
}

interface BidLeaderboardProps {
  projectId: string;
  projectStatus: ProjectStatus;
  trackType?: TrackType;
  subConfiguration?: SubConfiguration;
  serviceType?: ServiceType | null;
  mistriDetails?: unknown;
  tradeDetails?: unknown;
  buildingTypes?: string[] | null;
  totalFloors?: number | null;
  initialBuilders?: Record<string, BuilderInfo>;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  2: 'text-foreground/80 bg-muted/50 border-border/30',
  3: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

function bidderFallbackLabel(
  builderId: string,
  bidderSingular: string,
  builder?: BuilderInfo,
): string {
  return builder?.full_name ?? `${bidderSingular} #${builderId.slice(-6).toUpperCase()}`;
}

export function BidLeaderboard({
  projectId,
  projectStatus,
  trackType,
  subConfiguration,
  serviceType = 'labour_contractor',
  mistriDetails,
  tradeDetails,
  buildingTypes,
  totalFloors,
  initialBuilders,
}: BidLeaderboardProps) {
  const { t } = useTranslation();
  const supabase = createClient();
  const { bids, loading } = useRealtimeBids(projectId);
  const { profile } = useProfile();
  const [builders, setBuilders] = useState<Record<string, BuilderInfo>>(initialBuilders ?? {});
  const [ratings, setRatings] = useState<Record<string, { average: number; total: number }>>({});
  const bidder = getServiceBidderLabels(serviceType ?? 'labour_contractor');

  const isActive   = projectStatus === 'active_24h';
  const isLoggedIn = !!profile;
  const scopeBid = resolveScopeRateBidItems({
    service_type: serviceType,
    mistri_details: mistriDetails,
    trade_details: tradeDetails,
    track_type: trackType,
    sub_configuration: subConfiguration,
    building_types: buildingTypes,
    total_floors: totalFloors,
  });
  const isPlumbingBid = scopeBid?.kind === 'plumbing';
  const isElectricianBid = scopeBid?.kind === 'electrician';
  const isInteriorBid = scopeBid?.kind === 'interior';
  const isTradeUnitRateBid = Boolean(scopeBid?.unitRateBid);
  const plumbingOptions = isPlumbingBid
    ? readProjectPlumbingBidOptions({ trade_details: tradeDetails, sub_configuration: subConfiguration })
    : [];
  const electricianOptions = isElectricianBid
    ? readProjectElectricianBidOptions({ trade_details: tradeDetails })
    : [];
  const interiorOptions = isInteriorBid
    ? readProjectInteriorBidOptions({ trade_details: tradeDetails })
    : [];
  const tradeUnitRateOptions = isInteriorBid
    ? interiorOptions
    : isElectricianBid
      ? electricianOptions
      : plumbingOptions;
  const projectFloorCount = isTradeUnitRateBid
    ? Math.max(tradeUnitRateOptions.length, 1)
    : (scopeBid?.count
    ?? (trackType && subConfiguration
      ? getFloorInputCount(trackType, subConfiguration)
      : 1));
  const showFloorBreakdown = !isActive;

  useEffect(() => {
    const missingIds = bids
      .map((b) => b.builder_id)
      .filter((id): id is string => !!id && !builders[id]);

    if (missingIds.length === 0) return;

    supabase
      .from('profiles_public')
      .select('id, full_name, is_verified, avatar_url')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!data) return;
        setBuilders((prev) => ({
          ...prev,
          ...Object.fromEntries(
            data.map((p: { id: string; full_name: string; is_verified?: boolean; avatar_url?: string | null }) => [
              p.id,
              { full_name: p.full_name, is_verified: p.is_verified, avatar_url: p.avatar_url },
            ])
          ),
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids]);

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

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isLoggedIn && isActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-xl bg-secondary/30 border border-border text-center">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <EyeOff className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Leaderboard Restricted</p>
          <p className="text-xs text-muted-foreground">
            Sign in as a registered {bidder.singular} to participate and view live rankings.
          </p>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-secondary/30 border border-border text-center">
        <Trophy className="w-8 h-8 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">No Bids Yet</p>
          <p className="text-xs text-muted-foreground">
            Be the first {bidder.singular} to submit a competitive rate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {isTradeUnitRateBid && (
        <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">
          Ranked by lowest Weighted Index (equal-weight average of labour unit rates).
        </p>
      )}
      {trackType && subConfiguration && (
        <div className="px-2 pb-3 mb-1 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t('project.constructionScope')}
          </p>
          <ConstructionMatrixSummary
            trackType={trackType}
            subConfiguration={subConfiguration}
            className="space-y-1"
          />
        </div>
      )}

      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Rankings</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          <span className="text-xs text-muted-foreground">{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {bids.map((bid, index) => {
          const rank        = index + 1;
          const rankStyle   = RANK_STYLES[rank] ?? 'text-muted-foreground bg-secondary/30 border-border';
          const isMe        = profile?.id === bid.builder_id;
          const isLowest    = index === 0;
          const builderInfo = bid.builder_id ? builders[bid.builder_id] : undefined;
          const ratingInfo  = bid.builder_id ? ratings[bid.builder_id] : undefined;
          const displayName = isMe
            ? (profile?.full_name ?? builderInfo?.full_name ?? 'You')
            : bid.builder_id
              ? bidderFallbackLabel(bid.builder_id, bidder.singular, builderInfo)
              : bidder.singular;
          const avatarUrl   = isMe
            ? (profile?.avatar_url ?? builderInfo?.avatar_url)
            : builderInfo?.avatar_url;

          return (
            <motion.div
              key={bid.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              className={cn(
                'relative flex flex-wrap items-center gap-3 px-3 py-3 rounded-lg border',
                'transition-colors duration-200',
                isLowest
                  ? 'bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/40'
                  : 'bg-secondary/30 border-border hover:border-border',
                isMe && 'ring-1 ring-indigo-500/40'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-md border text-xs font-bold flex items-center justify-center',
                rankStyle
              )}>
                {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
              </div>

              <UserAvatar
                name={displayName}
                avatarUrl={avatarUrl}
                size="sm"
                gradient={isMe ? 'from-indigo-500 to-violet-600' : 'from-emerald-500 to-teal-600'}
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                {bid.builder_id ? (
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {displayName}
                      </p>
                      {builderInfo?.is_verified && (
                        <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded flex-shrink-0">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    {ratingInfo && ratingInfo.total > 0 && (
                      <div className="mt-0.5">
                        <BuilderRatingBadge
                          average={ratingInfo.average}
                          total={ratingInfo.total}
                          size="xs"
                          showCount
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{bidder.singular}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-muted-foreground/80" />
                  <p className="text-[10px] text-muted-foreground/80">{formatRelativeTime(bid.created_at)}</p>
                  {isMe && (
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className={cn(
                  'text-sm font-bold tabular-nums',
                  isLowest ? 'text-emerald-400' : 'text-foreground'
                )}>
                  {serviceType === 'plumber' && !isPlumbingBid ? 'Rs. ' : '₹'}
                  {formatBidMetric(
                    isTradeUnitRateBid && bid.rates?.weighted_index
                      ? bid.rates.weighted_index
                      : averageFromSumMetric(bid.total_sum_metric, projectFloorCount),
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isTradeUnitRateBid
                    ? 'weighted index'
                    : isPlumbingBid
                    ? 'overall avg'
                    : serviceType === 'plumber' ? 'Rs.' : serviceType === 'electrician' ? '/point' : projectFloorCount > 1 ? '/sqft avg' : '/sqft'}
                </p>
              </div>

              {showFloorBreakdown &&
                (shouldShowBidFloorBreakdown(bid.rates, projectFloorCount) ||
                  (isTradeUnitRateBid && Object.keys(bid.rates?.unit_rates ?? {}).length > 0)) && (
                <div className="w-full basis-full">
                  <BidFloorRatesBreakdown
                    rates={bid.rates}
                    floorLabels={scopeBid?.labels}
                    unitSuffix={isPlumbingBid ? '/Rft' : '/sqft'}
                    unitSuffixes={isPlumbingBid ? scopeBid?.rateUnits : undefined}
                    extraEntries={
                      isTradeUnitRateBid
                        ? isInteriorBid
                          ? getInteriorUnitRateDisplayEntries(bid.rates, interiorOptions)
                          : isElectricianBid
                            ? getElectricianUnitRateDisplayEntries(bid.rates, electricianOptions)
                            : getPlumbingUnitRateDisplayEntries(bid.rates, plumbingOptions)
                        : undefined
                    }
                    indexLabel="Weighted Index"
                    indexValue={isTradeUnitRateBid ? bid.rates?.weighted_index : undefined}
                  />
                </div>
              )}

              {isLowest && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-lg" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

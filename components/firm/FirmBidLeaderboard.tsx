'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingDown, EyeOff, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeFirmBids } from '@/lib/hooks/useRealtimeFirmBids';
import { useProfile } from '@/lib/hooks/useProfile';
import { FirmLogo, getFirmCityLabel } from '@/components/firm/FirmLogo';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { Button } from '@/components/ui/button';
import { PackageBidPriceList } from '@/components/firm/PackageBidPriceList';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ProjectStatus, PublicFirmProfile } from '@/lib/types';

interface FirmBidLeaderboardProps {
  projectId: string;
  projectStatus: ProjectStatus;
  floorAreaSqft?: number | null;
  biddingEndsAt: string;
  initialFirms?: Record<string, PublicFirmProfile>;
  highlightFirmId?: string | null;
  viewerCompanyName?: string | null;
  /** When true, skip the sign-in gate (bid console is already auth-protected server-side). */
  assumeAuthenticated?: boolean;
  showViewProfile?: boolean;
  compact?: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(251,191,36,0.15)]',
  2: 'text-slate-300 bg-slate-500/10 border-slate-400/30',
  3: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

export function FirmBidLeaderboard({
  projectId,
  projectStatus,
  floorAreaSqft,
  biddingEndsAt,
  initialFirms,
  highlightFirmId,
  viewerCompanyName,
  assumeAuthenticated = false,
  showViewProfile = true,
  compact = false,
}: FirmBidLeaderboardProps) {
  const supabaseRef = useRef(createClient());
  const { bids, loading } = useRealtimeFirmBids(projectId);
  const { profile } = useProfile();
  const [firms, setFirms] = useState<Record<string, PublicFirmProfile>>(initialFirms ?? {});
  const [flashId, setFlashId] = useState<string | null>(null);

  const isActive = projectStatus === 'active_24h';
  const isFrozen = projectStatus === 'frozen_24h';
  const isLoggedIn = assumeAuthenticated || !!profile || !!highlightFirmId;
  const biddingClosed = !isActive && !isFrozen;

  useEffect(() => {
    const missingIds = bids
      .map((b) => b.builder_id)
      .filter((id): id is string => !!id && !firms[id]);

    if (missingIds.length === 0) return;

    const supabase = supabaseRef.current;
    supabase
      .from('firms_public')
      .select('*')
      .in('id', missingIds)
      .then(({ data, error }) => {
        if (error || !data) return;
        setFirms((prev) => ({
          ...prev,
          ...Object.fromEntries(
            (data as PublicFirmProfile[]).map((f) => [f.id, f]),
          ),
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids]);

  useEffect(() => {
    if (bids.length === 0) return;
    const latest = bids[bids.length - 1];
    if (latest?.id) {
      setFlashId(latest.id);
      const t = setTimeout(() => setFlashId(null), 1200);
      return () => clearTimeout(t);
    }
  }, [bids]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isLoggedIn && isActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-xl bg-secondary/30 border border-border text-center">
        <EyeOff className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Leaderboard Restricted</p>
        <p className="text-xs text-muted-foreground">Sign in as a registered Construction Firm to view live rankings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {biddingClosed && (
        <div className="px-3 py-2 rounded-lg bg-slate-500/10 border border-slate-500/30 text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bidding Closed</p>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Bids</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">
            Sorted by lowest ₹/sqft rate • Updates in real-time
          </p>
        </div>
        {!compact && isActive && (
          <CountdownTicker targetDateISO={biddingEndsAt} compact />
        )}
      </div>

      {bids.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-secondary/30 border border-border text-center">
          <Trophy className="w-8 h-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No Bids Yet</p>
          <p className="text-xs text-muted-foreground">Be the first firm to submit a competitive rate.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {bids.map((bid, index) => {
            const rank = index + 1;
            const rankStyle = RANK_STYLES[rank] ?? 'text-muted-foreground bg-secondary/30 border-border';
            const isMe = highlightFirmId === bid.builder_id || profile?.id === bid.builder_id;
            const isLowest = index === 0;
            const firm = bid.builder_id ? firms[bid.builder_id] : undefined;
            const companyName =
              firm?.company_name
              ?? (isMe ? (viewerCompanyName ?? profile?.company_name) : null)
              ?? `Firm #${bid.builder_id?.slice(-6).toUpperCase() ?? '?'}`;
            const city = getFirmCityLabel(firm);
            const years = firm?.years_in_business;
            const isFlashing = flashId === bid.id;

            return (
              <motion.div
                key={bid.id}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                className={cn(
                  'relative flex flex-wrap items-center gap-3 px-3 py-3 rounded-lg border transition-colors duration-200',
                  isLowest
                    ? 'bg-emerald-500/5 border-emerald-500/25'
                    : 'bg-secondary/30 border-border',
                  isMe && 'ring-1 ring-violet-500/40',
                  isFlashing && 'ring-2 ring-emerald-400/50',
                )}
              >
                {isLowest && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-lg" />
                )}

                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-md border text-xs font-bold flex items-center justify-center',
                  rankStyle,
                )}>
                  {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                </div>

                <FirmLogo
                  companyName={companyName}
                  logoUrl={firm?.logo_url}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{companyName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {[city, years != null ? `${years} years in business` : null].filter(Boolean).join(' · ') || 'Construction firm'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground/80" />
                    <p className="text-[10px] text-muted-foreground/80">{formatRelativeTime(bid.created_at)}</p>
                    {isMe && (
                      <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">You</span>
                    )}
                    {isLowest && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Lowest Bid 🏆</span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <PackageBidPriceList
                    packageRates={bid.package_rates ?? []}
                    highlight={isLowest}
                    align="end"
                  />
                </div>

                {showViewProfile && bid.builder_id && (
                  <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                    <Link href={`/firm/${bid.builder_id}`}>View Profile</Link>
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

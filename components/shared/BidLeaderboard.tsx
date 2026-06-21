'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingDown, Eye, EyeOff, Clock } from 'lucide-react';
import { useRealtimeBids } from '@/lib/hooks/useRealtimeBids';
import { useProfile } from '@/lib/hooks/useProfile';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/types';

interface BidLeaderboardProps {
  projectId: string;
  projectStatus: ProjectStatus;
  ownerId?: string;
  showIdentity?: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  2: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
  3: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

export function BidLeaderboard({ projectId, projectStatus, ownerId, showIdentity }: BidLeaderboardProps) {
  const { bids, loading } = useRealtimeBids(projectId);
  const { profile }       = useProfile();

  const isActive   = projectStatus === 'active_24h';
  const isFrozen   = projectStatus === 'frozen_24h' || projectStatus === 'completed';
  const canReveal  = showIdentity || (isFrozen && profile?.id === ownerId) || profile?.role === 'admin';
  const isLoggedIn = !!profile;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isLoggedIn && isActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <EyeOff className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Leaderboard Restricted</p>
          <p className="text-xs text-slate-500">Sign in as a registered Builder to participate and view live rankings.</p>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-slate-800/30 border border-slate-800 text-center">
        <Trophy className="w-8 h-8 text-slate-700" />
        <div>
          <p className="text-sm font-semibold text-white mb-1">No Bids Yet</p>
          <p className="text-xs text-slate-500">Be the first builder to submit a competitive rate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Rankings</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          <span className="text-xs text-slate-500">{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {bids.map((bid, index) => {
          const rank        = index + 1;
          const rankStyle   = RANK_STYLES[rank] ?? 'text-slate-500 bg-slate-800/30 border-slate-800';
          const isMe        = profile?.id === bid.builder_id;
          const isLowest    = index === 0;

          return (
            <motion.div
              key={bid.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              className={cn(
                'relative flex items-center gap-3 px-3 py-3 rounded-lg border',
                'transition-colors duration-200',
                isLowest
                  ? 'bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/40'
                  : 'bg-slate-800/30 border-slate-800 hover:border-slate-700',
                isMe && 'ring-1 ring-indigo-500/40'
              )}
            >
              {/* Rank badge */}
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-md border text-xs font-bold flex items-center justify-center',
                rankStyle
              )}>
                {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
              </div>

              {/* Builder identity */}
              <div className="flex-1 min-w-0">
                {canReveal && bid.builder_id ? (
                  <p className="text-xs font-semibold text-white truncate">
                    Builder #{bid.builder_id.slice(-6).toUpperCase()}
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-slate-600" />
                    <p className="text-xs text-slate-600">Anonymous Builder</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-slate-600" />
                  <p className="text-[10px] text-slate-600">{formatRelativeTime(bid.created_at)}</p>
                  {isMe && (
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* Rate display */}
              <div className="flex-shrink-0 text-right">
                <p className={cn(
                  'text-sm font-bold tabular-nums',
                  isLowest ? 'text-emerald-400' : 'text-white'
                )}>
                  ₹{bid.total_sum_metric.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-500">total rate/sqft</p>
              </div>

              {/* Lowest indicator */}
              {isLowest && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-lg" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isActive && !isLoggedIn && (
        <p className="text-center text-xs text-slate-600 pt-2">
          Builder identities are hidden during active bidding
        </p>
      )}
    </div>
  );
}

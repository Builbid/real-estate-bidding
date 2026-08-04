'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Trophy, TrendingDown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeFirmBids } from '@/lib/hooks/useRealtimeFirmBids';
import { FirmLogo, getFirmCityLabel } from '@/components/firm/FirmLogo';
import { SelectFirmButton } from '@/components/firm/SelectFirmButton';
import { PackageBidPriceList } from '@/components/firm/PackageBidPriceList';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOwnerProjectPhaseContext } from '@/lib/context/OwnerProjectPhaseContext';
import type { Project, Bid, PublicFirmProfile } from '@/lib/types';

interface Props {
  initialBids: Bid[];
  initialFirms: Record<string, PublicFirmProfile>;
}

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export function UnifiedFirmBidRankings({
  initialBids, initialFirms,
}: Props) {
  const { project, isReveal, isFrozen } = useOwnerProjectPhaseContext();
  const supabase = createClient();
  const { bids: realtimeBids, loading } = useRealtimeFirmBids(project.id);
  const [firms, setFirms] = useState<Record<string, PublicFirmProfile>>(initialFirms);

  const bids = realtimeBids.length > 0 ? realtimeBids : initialBids;
  const isCompleted = project.status === 'completed';

  useEffect(() => {
    const missingIds = bids
      .filter((b) => b.builder_id && !firms[b.builder_id])
      .map((b) => b.builder_id as string);

    if (missingIds.length === 0) return;

    supabase
      .from('firms_public')
      .select('*')
      .in('id', missingIds)
      .then(({ data }) => {
        if (data) {
          setFirms((prev) => ({
            ...prev,
            ...Object.fromEntries((data as PublicFirmProfile[]).map((f) => [f.id, f])),
          }));
        }
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
        <p className="text-sm font-semibold text-foreground">No bids yet</p>
        <p className="text-xs text-muted-foreground">Firm bids will appear here in real time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Bids — {bids.length} bid{bids.length !== 1 ? 's' : ''}
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
          const firm = firms[bid.builder_id ?? ''];
          const isSelected = project.selected_builder_id === bid.builder_id;
          const isLowest = index === 0;
          const companyName = firm?.company_name ?? `Firm #${bid.builder_id?.slice(-6).toUpperCase()}`;

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
                  ? 'border-violet-500/30 bg-violet-500/5'
                  : 'border-border bg-card/80'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold ${
                isSelected ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-secondary border-border text-muted-foreground'
              }`}>
                {RANK_MEDAL[index] ?? index + 1}
              </div>

              <FirmLogo companyName={companyName} logoUrl={firm?.logo_url} size="md" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{companyName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {[getFirmCityLabel(firm), firm?.years_in_business != null ? `${firm.years_in_business} years` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{formatRelativeTime(bid.created_at)}</p>
              </div>

              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <PackageBidPriceList
                  packageRates={bid.package_rates ?? []}
                  highlight={isLowest}
                  align="end"
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isReveal && bid.builder_id && (
                  <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                    <Link href={`/firm/${bid.builder_id}`}>View Profile</Link>
                  </Button>
                )}

                {isFrozen && !project.selected_builder_id && bid.builder_id && (
                  <SelectFirmButton
                    projectId={project.id}
                    firmId={bid.builder_id}
                    companyName={companyName}
                  />
                )}

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

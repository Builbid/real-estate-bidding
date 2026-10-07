'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User, BadgeCheck, Calendar, Layers, TrendingDown,
  Building, Loader2, MapPin, Briefcase,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BuilderPortfolioGrid } from '@/components/shared/BuilderPortfolioGrid';
import { createClient } from '@/lib/supabase/client';
import { formatYearsExperience } from '@/lib/workers/experience';
import { formatBidUnitSuffix, formatTripCapacityLabel } from '@/lib/bid/earthworkBid';
import { resolveScopeRateBidItems } from '@/lib/bid/scopeRateBid';
import { getBidFloorRateEntries } from '@/lib/bid/floorRateDisplay';
import { useOwnerProjectPhaseContext } from '@/lib/context/OwnerProjectPhaseContext';
import type { Bid, BuilderPortfolioItem } from '@/lib/types';

interface BuilderInfo {
  id: string;
  full_name: string;
  is_verified?: boolean;
  created_at: string;
}

interface PortfolioProps {
  builder: BuilderInfo;
  bid: Bid;
}

interface WonProject {
  id: string;
  title: string;
  district: string;
  track_type: string;
  created_at: string;
}

export function BuilderPortfolioModal({
  builder, bid,
}: PortfolioProps) {
  const supabase = createClient();
  const { project } = useOwnerProjectPhaseContext();
  const scopeLabels = resolveScopeRateBidItems(project)?.labels;
  const [open, setOpen] = useState(false);

  const [wonProjects, setWonProjects] = useState<WonProject[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<BuilderPortfolioItem[]>([]);
  const [yearsOfExperience, setYearsOfExperience] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    setLoadingData(true);

    const [projectsRes, portfolioRes, profileRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, district, track_type, created_at')
        .eq('selected_builder_id', builder.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('builder_portfolio_items')
        .select('*')
        .eq('builder_id', builder.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('profiles_public')
        .select('years_in_business')
        .eq('id', builder.id)
        .maybeSingle(),
    ]);

    setWonProjects((projectsRes.data ?? []) as WonProject[]);
    setPortfolioItems((portfolioRes.data ?? []) as BuilderPortfolioItem[]);
    const years = profileRes.data?.years_in_business;
    setYearsOfExperience(typeof years === 'number' && years > 0 ? Math.floor(years) : null);

    setLoadingData(false);
  }, [builder.id, supabase]);

  useEffect(() => {
    if (open) fetchPortfolio();
  }, [open, fetchPortfolio]);

  const rateEntries = getBidFloorRateEntries(bid.rates, scopeLabels).map(({ key, label, value }) => [key, value, label] as const);

  const memberSince = new Date(builder.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long',
  });
  const experienceLabel = formatYearsExperience(yearsOfExperience);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <User className="w-3.5 h-3.5" />
          View Profile
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 flex-wrap text-lg">
                {builder.full_name}
                {builder.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
              </DialogTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {experienceLabel && (
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {experienceLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/50 p-3">
                <Briefcase className="mb-1 h-4 w-4 text-indigo-400" />
                <p className="text-base font-bold text-foreground">{portfolioItems.length}</p>
                <p className="text-[10px] text-muted-foreground">Portfolio Projects</p>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/50 p-3">
                <Calendar className="mb-1 h-4 w-4 text-indigo-400" />
                <p className="text-center text-[11px] font-bold leading-tight text-foreground">{memberSince}</p>
                <p className="text-[10px] text-muted-foreground">Member Since</p>
              </div>
            </div>

            {builder.is_verified && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-emerald-300">Verified builder account</span>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed Projects Portfolio ({portfolioItems.length})
                </p>
              </div>
              <BuilderPortfolioGrid items={portfolioItems} />
            </div>

            {/* Current bid breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bid on This Project</p>
              </div>
              <div className="space-y-1.5">
                {rateEntries.map(([key, val, label]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 border border-border">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">₹{val.toLocaleString('en-IN')}{formatBidUnitSuffix(bid.rates, undefined, bid.service_type)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 mt-1">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-sm font-semibold text-foreground">Total Rate Metric</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-300 tabular-nums">
                    ₹{bid.total_sum_metric.toLocaleString('en-IN')}{formatBidUnitSuffix(bid.rates, undefined, bid.service_type)}
                    {formatTripCapacityLabel(bid.rates?.vehicleCapacityCum)
                      ? ` (${formatTripCapacityLabel(bid.rates?.vehicleCapacityCum)})`
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Won projects */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed on BuilBid ({wonProjects.length})
                </p>
              </div>
              {wonProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2">No completed projects yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {wonProjects.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <Building className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{p.district}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">Completed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Contact details (phone, email, address) are never shown here — shared only after contract confirmation.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

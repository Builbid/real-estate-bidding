'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingDown, Info, CheckCircle2, AlertCircle,
  RefreshCw, Building, Layers
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeBids } from '@/lib/hooks/useRealtimeBids';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getFloorInputCount, getFloorLabels, getRateKeys,
  computeTotalMetric, formatRelativeTime, TRACK_LABELS, cn
} from '@/lib/utils';
import { RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS } from '@/lib/types';
import type { Project, Bid, BidRates } from '@/lib/types';

interface Props {
  project: Project;
  existingBid: Bid | null;
  builderId: string;
  builderName: string;
}

const FLOOR_RATE_KEYS: Array<keyof BidRates> = ['ground_rate', 'first_rate', 'second_rate'];

export function BiddingConsole({ project, existingBid, builderId, builderName }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const { bids, loading: bidsLoading } = useRealtimeBids(project.id);

  const floorCount  = getFloorInputCount(project.track_type, project.sub_configuration);
  const floorLabels = getFloorLabels(floorCount);
  const rateKeys    = getRateKeys(floorCount);

  const [rates, setRates] = useState<Partial<BidRates>>(() => {
    if (existingBid) return existingBid.rates;
    return {};
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const totalMetric = computeTotalMetric(rates);

  const myCurrentBid = bids.find((b) => b.builder_id === builderId);
  const myRank       = bids.findIndex((b) => b.builder_id === builderId) + 1;
  const lowestBid    = bids[0];
  const isLeading    = myCurrentBid && myCurrentBid.id === bids[0]?.id;

  const configLabel = project.track_type === 'RCC'
    ? project.sub_configuration.rcc_config ? RCC_CONFIG_LABELS[project.sub_configuration.rcc_config] : '—'
    : project.sub_configuration.assam_config ? ASSAM_CONFIG_LABELS[project.sub_configuration.assam_config] : '—';

  const allFilled = rateKeys.every((k) => (rates[k] ?? 0) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    const ratesPayload: BidRates = {
      ground_rate:  rates.ground_rate ?? 0,
      first_rate:   floorCount >= 2 ? (rates.first_rate ?? 0) : undefined,
      second_rate:  floorCount >= 3 ? (rates.second_rate ?? 0) : undefined,
    };

    if (existingBid || myCurrentBid) {
      // Update existing bid
      const bidId = existingBid?.id ?? myCurrentBid!.id;
      const { error: upErr } = await supabase
        .from('bids')
        .update({ rates: ratesPayload, updated_at: new Date().toISOString() })
        .eq('id', bidId);
      if (upErr) { setError(upErr.message); setLoading(false); return; }
    } else {
      // Insert new bid
      const { error: insErr } = await supabase.from('bids').insert({
        project_id:  project.id,
        builder_id:  builderId,
        rates:       ratesPayload,
        is_withdrawn: false,
      });
      if (insErr) { setError(insErr.message); setLoading(false); return; }
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/builder" className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Auction
            </Badge>
            <Badge>{TRACK_LABELS[project.track_type]}</Badge>
          </div>
          <h1 className="text-lg font-bold text-white leading-snug">{project.title}</h1>
          <p className="text-xs text-slate-500">{project.district} · {configLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Bid entry form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Countdown */}
          <Card className="border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-xs text-emerald-400 uppercase tracking-wider">Auction Closes In</CardTitle>
            </CardHeader>
            <CardContent>
              <CountdownTicker targetDateISO={project.bidding_ends_at} />
            </CardContent>
          </Card>

          {/* Bid input card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                {myCurrentBid ? 'Update Your Bid' : 'Submit Rate Bid'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Bid submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 mb-4">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    Enter your rate in <strong>₹ per sqft</strong> for each floor. Lower total rates rank higher.
                  </p>
                </div>

                {/* Dynamic floor inputs */}
                <AnimatePresence>
                  {floorLabels.map((label, i) => {
                    const key = FLOOR_RATE_KEYS[i];
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Input
                          label={`${label} Rate`}
                          type="number"
                          placeholder="e.g. 1800"
                          value={rates[key] ?? ''}
                          onChange={(e) => setRates((r) => ({ ...r, [key]: parseFloat(e.target.value) || 0 }))}
                          prefix={<span className="text-slate-500 text-xs">₹</span>}
                          suffix={<span className="text-slate-600 text-xs">/sqft</span>}
                          required
                          min={1}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Total metric preview */}
                <div className={cn(
                  'flex items-center justify-between p-3.5 rounded-xl border',
                  totalMetric > 0
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-slate-800/50 border-slate-800'
                )}>
                  <div>
                    <p className="text-xs text-slate-500">Your Total Rate Metric</p>
                    <p className={cn('text-xl font-bold tabular-nums', totalMetric > 0 ? 'text-emerald-400' : 'text-slate-600')}>
                      ₹{totalMetric.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 text-right">{floorCount} floor{floorCount > 1 ? 's' : ''}<br />combined</p>
                </div>

                {/* Rank preview */}
                {myCurrentBid && myRank > 0 && (
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border text-sm',
                    isLeading
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800/50 border-slate-800 text-slate-400'
                  )}>
                    <TrendingDown className="w-4 h-4 flex-shrink-0" />
                    {isLeading
                      ? '🏆 You are currently leading!'
                      : `You are ranked #${myRank} of ${bids.length}`}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading || !allFilled}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {myCurrentBid ? 'Updating…' : 'Submitting…'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {myCurrentBid ? <><RefreshCw className="w-4 h-4" /> Update Bid</> : <><CheckCircle2 className="w-4 h-4" /> Submit Bid</>}
                    </span>
                  )}
                </Button>

                {myCurrentBid && (
                  <p className="text-center text-xs text-slate-600">
                    Last submitted {formatRelativeTime(myCurrentBid.updated_at ?? myCurrentBid.created_at)}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Leaderboard */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Live Leaderboard
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-normal text-slate-400">Real-time</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-slate-800/50 animate-pulse" />)}
                </div>
              ) : bids.length === 0 ? (
                <div className="py-10 text-center">
                  <Building className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Be the first to bid!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {bids.map((bid, index) => {
                      const isMe     = bid.builder_id === builderId;
                      const isLowest = index === 0;

                      return (
                        <motion.div
                          key={bid.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className={cn(
                            'relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                            isLowest && !isMe && 'bg-slate-800/40 border-slate-700',
                            isLowest && isMe  && 'bg-emerald-500/8 border-emerald-500/30',
                            !isLowest && isMe  && 'bg-indigo-500/5 border-indigo-500/20 ring-1 ring-indigo-500/20',
                            !isLowest && !isMe && 'bg-slate-800/20 border-slate-800'
                          )}
                        >
                          {isLowest && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-xl" />
                          )}

                          <div className={cn(
                            'w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold flex-shrink-0',
                            index === 0 ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                            : index === 1 ? 'bg-slate-400/10 border-slate-500/30 text-slate-300'
                            : index === 2 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                          )}>
                            {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            {isMe ? (
                              <p className="text-sm font-semibold text-white">You ({builderName})</p>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Anonymous Builder</p>
                            )}
                            <p className="text-[10px] text-slate-600">{formatRelativeTime(bid.created_at)}</p>
                          </div>

                          <div className="text-right">
                            <p className={cn(
                              'text-sm font-bold tabular-nums',
                              isLowest ? 'text-emerald-400' : isMe ? 'text-indigo-300' : 'text-white'
                            )}>
                              ₹{bid.total_sum_metric.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-600">/sqft total</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {lowestBid && !bids.some((b) => b.builder_id === builderId) && (
                    <div className="pt-3 px-2">
                      <p className="text-xs text-slate-500">
                        💡 Current lowest: <strong className="text-emerald-400">₹{lowestBid.total_sum_metric.toLocaleString('en-IN')}/sqft</strong> — Beat it to lead.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

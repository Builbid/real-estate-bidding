'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingDown, Info, CheckCircle2, AlertCircle,
  RefreshCw, Building, Layers, Clock
} from 'lucide-react';
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
import {
  BID_RATE_ERROR,
  getBidRateFieldError,
  isValidBidRate,
  parseBidRateValue,
  parseBidDbError,
  ratesToInputStrings,
  roundBidRateToNearestFive,
  sanitizeBidRateInput,
  validateBidRatesForFloorCount,
} from '@/lib/validation/bidRates';
import { submitBidAction } from '@/app/actions/bid';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { createClient } from '@/lib/supabase/client';
import { ConstructionMatrixSummary } from '@/components/construction/ConstructionMatrixSummary';
import type { Project, Bid, BidRates } from '@/lib/types';

interface Props {
  project: Project;
  existingBid: Bid | null;
  builderId: string;
  builderName: string;
  builderAvatarUrl?: string | null;
}

const FLOOR_RATE_KEYS: Array<keyof BidRates> = ['ground_rate', 'first_rate', 'second_rate'];

interface BuilderInfo {
  full_name: string;
  avatar_url?: string | null;
}

export function BiddingConsole({ project, existingBid, builderId, builderName, builderAvatarUrl }: Props) {
  const { bids, loading: bidsLoading } = useRealtimeBids(project.id);
  const supabase = createClient();
  const [builders, setBuilders] = useState<Record<string, BuilderInfo>>({});

  const floorCount  = getFloorInputCount(project.track_type, project.sub_configuration);
  const floorLabels = getFloorLabels(floorCount);
  const rateKeys    = getRateKeys(floorCount);

  const [rateInputs, setRateInputs] = useState<Partial<Record<keyof BidRates, string>>>(() =>
    existingBid ? ratesToInputStrings(existingBid.rates) : {},
  );
  const [rates, setRates] = useState<Partial<BidRates>>(() => {
    if (existingBid) return existingBid.rates;
    return {};
  });
  const [rateErrors, setRateErrors] = useState<Partial<Record<keyof BidRates, string>>>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const isGracePeriod = project.status === 'frozen_24h';
  const totalMetric   = computeTotalMetric(rates);

  const myCurrentBid = bids.find((b) => b.builder_id === builderId);
  const myRank       = bids.findIndex((b) => b.builder_id === builderId) + 1;
  const lowestBid    = bids[0];
  const isLeading    = myCurrentBid && myCurrentBid.id === bids[0]?.id;

  useEffect(() => {
    const missingIds = bids
      .map((b) => b.builder_id)
      .filter((id): id is string => !!id && id !== builderId && !builders[id]);

    if (missingIds.length === 0) return;

    supabase
      .from('profiles_public')
      .select('id, full_name, avatar_url')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!data) return;
        setBuilders((prev) => ({
          ...prev,
          ...Object.fromEntries(
            data.map((p: { id: string; full_name: string; avatar_url?: string | null }) => [
              p.id,
              { full_name: p.full_name, avatar_url: p.avatar_url },
            ])
          ),
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, builderId]);

  const allFilled = rateKeys.every((k) => isValidBidRate(rates[k]));
  const hasRateErrors = rateKeys.some((k) => !!rateErrors[k]);
  const canSubmit = allFilled && !hasRateErrors;

  function validateRateField(key: keyof BidRates, value: number | undefined) {
    const fieldError = getBidRateFieldError(value);
    setRateErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[key] = fieldError;
      else delete next[key];
      return next;
    });
  }

  function handleRateChange(key: keyof BidRates, raw: string) {
    const sanitized = sanitizeBidRateInput(raw);
    setRateInputs((prev) => ({ ...prev, [key]: sanitized }));
    const value = parseBidRateValue(sanitized);
    setRates((prev) => ({ ...prev, [key]: value ?? 0 }));

    if (!sanitized) {
      setRateErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    validateRateField(key, value);
  }

  function handleRateBlur(key: keyof BidRates) {
    const value = parseBidRateValue(rateInputs[key] ?? '');
    validateRateField(key, value);
  }

  function handleRoundToNearestFive(key: keyof BidRates) {
    const current = parseBidRateValue(rateInputs[key] ?? '') ?? rates[key] ?? 0;
    if (current <= 0) return;

    const rounded = roundBidRateToNearestFive(current);
    const sanitized = String(rounded);

    setRateInputs((prev) => ({ ...prev, [key]: sanitized }));
    setRates((prev) => ({ ...prev, [key]: rounded }));
    validateRateField(key, rounded);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateBidRatesForFloorCount(rates, floorCount);
    setRateErrors(validation.errors);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const bidId = existingBid?.id ?? myCurrentBid?.id ?? null;
    const result = await submitBidAction(project.id, {
      ground_rate: rates.ground_rate ?? 0,
      first_rate: rates.first_rate,
      second_rate: rates.second_rate,
    }, bidId);

    if (result.error) {
      setError(parseBidDbError(result.error));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/builder" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isGracePeriod ? (
              <Badge variant="indigo">
                <Clock className="w-3 h-3" />
                Grace Period
              </Badge>
            ) : (
              <Badge variant="emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Auction
              </Badge>
            )}
            <Badge>{TRACK_LABELS[project.track_type]}</Badge>
          </div>
          <h1 className="text-lg font-bold text-foreground leading-snug">{project.title}</h1>
          <p className="text-xs text-muted-foreground">{project.district}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <ConstructionMatrixSummary
            trackType={project.track_type}
            subConfiguration={project.sub_configuration}
          />
        </CardContent>
      </Card>

      {/* Countdown — full width above the bid / leaderboard split */}
      {isGracePeriod ? (
        <>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Grace Period Active</p>
              <p className="text-xs text-amber-400/70">
                Bidding has closed but you can still submit or update your bid. The owner is reviewing bids and will select a builder before the deadline below.
              </p>
            </div>
          </div>
          {project.selection_ends_at && (
            <Card className="border-amber-500/20">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs text-amber-400 uppercase tracking-wider">Grace Period Closes In</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <CountdownTicker targetDateISO={project.selection_ends_at} />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-emerald-400 uppercase tracking-wider">Auction Closes In</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <CountdownTicker targetDateISO={project.bidding_ends_at} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
        {/* Left: Update Your Bid */}
        <div className="min-w-0 lg:self-stretch">
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                {myCurrentBid ? 'Update Your Bid' : 'Submit Rate Bid'}
              </CardTitle>
              <div className="flex items-center gap-2.5 pt-0.5">
                <UserAvatar
                  name={builderName}
                  avatarUrl={builderAvatarUrl}
                  size="md"
                  gradient="from-emerald-500 to-teal-600"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{builderName}</p>
                  <p className="text-[10px] text-muted-foreground">Your profile on the live leaderboard</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {error && (
                <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Bid submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 mb-2">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    Enter your rate in <strong>₹ per sqft</strong> for each floor. Rates must be whole numbers ending in <strong>0 or 5</strong>. Lower total rates rank higher.
                  </p>
                </div>

                {/* Dynamic floor inputs */}
                <AnimatePresence>
                  {floorLabels.map((label, i) => {
                    const key = FLOOR_RATE_KEYS[i];
                    const inputValue = rateInputs[key] ?? '';
                    const numericValue = parseBidRateValue(inputValue);
                    const fieldError = rateErrors[key];
                    const showRoundHelper =
                      !!fieldError &&
                      fieldError === BID_RATE_ERROR &&
                      numericValue !== undefined &&
                      numericValue > 0;

                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Input
                          label={`${label} Rate`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 1800"
                          value={inputValue}
                          onChange={(e) => handleRateChange(key, e.target.value)}
                          onBlur={() => handleRateBlur(key)}
                          prefix={<span className="text-muted-foreground text-xs">₹</span>}
                          suffix={<span className="text-muted-foreground/80 text-xs">/sqft</span>}
                          error={fieldError}
                          required
                        />
                        {showRoundHelper && (
                          <button
                            type="button"
                            onClick={() => handleRoundToNearestFive(key)}
                            className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                          >
                            Round to nearest 5 (→ ₹{roundBidRateToNearestFive(numericValue).toLocaleString('en-IN')})
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Total metric preview */}
                <div className={cn(
                  'flex items-center justify-between p-2.5 rounded-xl border',
                  totalMetric > 0
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-secondary/50 border-border'
                )}>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Total Rate Metric</p>
                    <p className={cn('text-lg font-bold tabular-nums', totalMetric > 0 ? 'text-emerald-400' : 'text-muted-foreground/80')}>
                      ₹{totalMetric.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground/80 text-right">{floorCount} floor{floorCount > 1 ? 's' : ''}<br />combined</p>
                </div>

                {/* Rank preview */}
                {myCurrentBid && myRank > 0 && (
                  <div className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg border text-sm',
                    isLeading
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-secondary/50 border-border text-muted-foreground'
                  )}>
                    <TrendingDown className="w-4 h-4 flex-shrink-0" />
                    {isLeading
                      ? '🏆 You are currently leading!'
                      : `You are ranked #${myRank} of ${bids.length}`}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading || !canSubmit}>
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
                  <p className="text-center text-xs text-muted-foreground/80">
                    Last submitted {formatRelativeTime(myCurrentBid.updated_at ?? myCurrentBid.created_at)}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Leaderboard */}
        <div className="min-w-0 lg:self-stretch">
          <Card className="h-full min-h-full flex flex-col">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Live Leaderboard
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-normal text-muted-foreground">Real-time</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 flex-1">
              {bidsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />)}
                </div>
              ) : bids.length === 0 ? (
                <div className="py-10 text-center">
                  <Building className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Be the first to bid!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {bids.map((bid, index) => {
                      const isMe     = bid.builder_id === builderId;
                      const isLowest = index === 0;
                      const competitor = bid.builder_id ? builders[bid.builder_id] : undefined;
                      const rowName = isMe
                        ? builderName
                        : competitor?.full_name ?? (bid.builder_id ? `Builder #${bid.builder_id.slice(-6).toUpperCase()}` : 'Builder');
                      const rowAvatar = isMe ? builderAvatarUrl : competitor?.avatar_url;

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
                            isLowest && !isMe && 'bg-secondary/40 border-border',
                            isLowest && isMe  && 'bg-emerald-500/8 border-emerald-500/30',
                            !isLowest && isMe  && 'bg-indigo-500/5 border-indigo-500/20 ring-1 ring-indigo-500/20',
                            !isLowest && !isMe && 'bg-secondary/20 border-border'
                          )}
                        >
                          {isLowest && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-xl" />
                          )}

                          <div className={cn(
                            'w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold flex-shrink-0',
                            index === 0 ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                            : index === 1 ? 'bg-muted/50 border-border/30 text-foreground/80'
                            : index === 2 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            : 'bg-secondary border-border text-muted-foreground'
                          )}>
                            {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                          </div>

                          <div className="flex-1 min-w-0 flex items-center gap-2.5">
                            <UserAvatar
                              name={rowName}
                              avatarUrl={rowAvatar}
                              size="sm"
                              gradient={isMe ? 'from-indigo-500 to-violet-600' : 'from-emerald-500 to-teal-600'}
                            />
                            <div className="min-w-0">
                              <p className={cn(
                                'truncate',
                                isMe ? 'text-sm font-semibold text-foreground' : 'text-sm font-medium text-foreground/90'
                              )}>
                                {isMe ? `You (${builderName})` : rowName}
                              </p>
                              <p className="text-[10px] text-muted-foreground/80">{formatRelativeTime(bid.created_at)}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={cn(
                              'text-sm font-bold tabular-nums',
                              isLowest ? 'text-emerald-400' : isMe ? 'text-indigo-300' : 'text-foreground'
                            )}>
                              ₹{bid.total_sum_metric.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80">/sqft total</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {lowestBid && !bids.some((b) => b.builder_id === builderId) && (
                    <div className="pt-3 px-2">
                      <p className="text-xs text-muted-foreground">
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

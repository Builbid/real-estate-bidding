'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, AlertCircle, Clock, Download, FileText,
  TrendingDown, Trophy,
} from 'lucide-react';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK, NAV_ICON_BUTTON } from '@/lib/navStyles';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { PackageInfoButton } from '@/components/firm/PackageInfoButton';
import { PackageBidPriceList } from '@/components/firm/PackageBidPriceList';
import { useRealtimeFirmBids } from '@/lib/hooks/useRealtimeFirmBids';
import { createClient } from '@/lib/supabase/client';
import {
  getFinishingBadge,
  getProjectBudgetDisplay,
  getProjectFloorAreaDisplay,
} from '@/lib/project/display';
import { formatEstimatedTotalLabel } from '@/lib/firm/bidDisplay';
import {
  BID_RATE_ERROR,
  getBidRateFieldError,
  isValidBidRate,
  parseBidDbError,
  parseBidRateValue,
  sanitizeBidRateInput,
  validateSingleRate,
} from '@/lib/validation/singleRate';
import { submitFirmBidAction, type PackageRateInput } from '@/app/actions/firmBid';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Project, Bid, FirmConstructionPackage, PublicFirmProfile } from '@/lib/types';

interface Props {
  project: Project;
  existingBid: Bid | null;
  firmId: string;
  companyName: string;
  logoUrl?: string | null;
  packages: FirmConstructionPackage[];
}

export function FirmBiddingConsole({
  project,
  existingBid,
  firmId,
  companyName,
  logoUrl,
  packages,
}: Props) {
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const projectId = project?.id ?? '';
  const { bids, loading: bidsLoading } = useRealtimeFirmBids(projectId);
  const [firms, setFirms] = useState<Record<string, PublicFirmProfile>>({});

  const safeCompanyName = companyName?.trim() || 'Your Firm';
  const buildingTypes = project?.building_types ?? [];
  const floorAreaSqft = project?.floor_area_sqft ?? null;

  const [rateInputs, setRateInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const existingRates = existingBid?.package_rates ?? [];
    for (const pkg of packages) {
      const match = existingRates.find((r) => r.package.id === pkg.id);
      if (match && Number.isFinite(match.rate) && match.rate > 0) {
        map[pkg.id] = String(Math.trunc(match.rate));
      }
    }
    return map;
  });
  const [rateErrors, setRateErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successRank, setSuccessRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const countdown = useCountdown(project?.bidding_ends_at);
  const isBiddingOpen = project?.status === 'active_24h' && !countdown.isExpired;
  const wasAwardedToMe = project?.status === 'completed' && project?.selected_builder_id === firmId;

  const parsedRates: Record<string, number | undefined> = {};
  for (const pkg of packages) {
    parsedRates[pkg.id] = parseBidRateValue(rateInputs[pkg.id] ?? '');
  }
  const canSubmit =
    packages.length > 0 &&
    packages.every((pkg) => isValidBidRate(parsedRates[pkg.id])) &&
    Boolean(projectId);

  const myCurrentBid = bids.find((b) => b.builder_id === firmId);
  const myRank = bids.findIndex((b) => b.builder_id === firmId) + 1;

  const finishingBadge = getFinishingBadge(project?.finishing_level ?? null);
  const floorAreaDisplay = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);

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
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) return;
        setFirms((prev) => ({
          ...prev,
          ...Object.fromEntries(
            (data as PublicFirmProfile[]).map((f) => [f.id, f]),
          ),
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids]);

  function handleRateChange(packageId: string, raw: string) {
    const sanitized = sanitizeBidRateInput(raw);
    setRateInputs((prev) => ({ ...prev, [packageId]: sanitized }));
    if (!sanitized) {
      setRateErrors((prev) => ({ ...prev, [packageId]: null }));
      return;
    }
    const value = parseBidRateValue(sanitized);
    setRateErrors((prev) => ({ ...prev, [packageId]: getBidRateFieldError(value) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError('Project not found. Please go back and try again.');
      return;
    }

    const nextErrors: Record<string, string | null> = {};
    let firstErrorMessage: string | null = null;

    for (const pkg of packages) {
      const validation = validateSingleRate(parsedRates[pkg.id]);
      if (!validation.valid) {
        nextErrors[pkg.id] = validation.message;
        firstErrorMessage ??= `"${pkg.name}": ${validation.message}`;
      }
    }

    if (firstErrorMessage) {
      setRateErrors(nextErrors);
      setError(firstErrorMessage);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const bidId = existingBid?.id ?? myCurrentBid?.id ?? null;
    const packageRatesPayload: PackageRateInput[] = packages.map((pkg) => ({
      package_id: pkg.id,
      rate: parsedRates[pkg.id] as number,
    }));
    const result = await submitFirmBidAction(projectId, packageRatesPayload, bidId);

    if (result.error) {
      setError(parseBidDbError(result.error));
      setLoading(false);
      return;
    }

    const rankAfter = bids.findIndex((b) => b.builder_id === firmId) + 1;
    setSuccessRank(rankAfter > 0 ? rankAfter : myRank || 1);
    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      leaderboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    setTimeout(() => setSuccess(false), 4000);
  }

  if (!projectId) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
        Could not load project details. Please go back and try again.
        <div className="mt-4">
          <Button asChild variant="outline">
            <NavLink href="/dashboard/firm" prefetch className={NAV_BACK_LINK}>
              <ArrowLeft className="w-4 h-4" /> Back to Firm Console
            </NavLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <NavLink
          href="/dashboard/firm"
          prefetch
          className={cn(NAV_ICON_BUTTON, 'p-1 text-muted-foreground hover:text-foreground')}
        >
          <ArrowLeft className="w-5 h-5" />
        </NavLink>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isBiddingOpen ? (
              <Badge variant="emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Auction
              </Badge>
            ) : (
              <Badge>Bidding Closed</Badge>
            )}
            <Badge variant="violet">Construction Firm</Badge>
          </div>
          <h1 className="text-lg font-bold text-foreground leading-snug">
            {project?.title ?? 'Untitled Project'}
          </h1>
        </div>
      </div>

      {isBiddingOpen && project?.bidding_ends_at ? (
        <Card className="border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-emerald-400 uppercase tracking-wider">Auction Closes In</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <CountdownTicker targetDateISO={project.bidding_ends_at} />
          </CardContent>
        </Card>
      ) : (
        <div className="px-3 py-2 rounded-lg bg-slate-500/10 border border-slate-500/30 text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">BIDDING CLOSED</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <FirmLogo companyName={safeCompanyName} logoUrl={logoUrl ?? null} size="md" />
                <div>
                  <p className="text-sm font-bold text-foreground">{safeCompanyName}</p>
                  <p className="text-[10px] text-muted-foreground">Bidding as Construction Firm</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2 text-sm">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Project Summary</p>
                {buildingTypes.length > 0 && (
                  <BuildingConfigSummary project={project} compact hideConstructionTypes />
                )}
                {finishingBadge && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Finishing:</span>
                    <Badge className="text-[10px]">{finishingBadge}</Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Floor area: {floorAreaDisplay ?? 'Not specified'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Location: {project?.district ?? 'Location not specified'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Budget: {budgetDisplay ?? 'Not specified'}
                </p>
                {project?.drawing_url ? (
                  <a
                    href={project.drawing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Drawing 📐
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Owner requires firm to create drawing
                  </p>
                )}
              </div>

              {wasAwardedToMe && project?.selected_package && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    You were awarded this project with your{' '}
                    <strong>{project.selected_package.package.name}</strong> package at{' '}
                    <strong>₹{project.selected_package.rate.toLocaleString('en-IN')}/sqft</strong>.
                  </span>
                </div>
              )}

              {packages.length === 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Add your construction packages in{' '}
                    <NavLink href="/dashboard/firm/settings" className="underline font-medium">
                      Firm Settings
                    </NavLink>{' '}
                    before you can bid.
                  </span>
                </div>
              ) : isBiddingOpen ? (
                <>
                  {error && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      Your bid is live! You&apos;re currently ranked #{successRank ?? myRank ?? '—'}
                    </div>
                  )}

                  {myCurrentBid && myRank > 0 && !success && (
                    <p className="text-xs text-violet-400 font-medium">
                      You are currently ranked #{myRank}
                    </p>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Your Rates</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enter a complete rate per sqft (materials + labour + finishing included) for
                        each of your packages
                      </p>
                    </div>

                    <div className="space-y-3">
                      {packages.map((pkg) => {
                        const value = rateInputs[pkg.id] ?? '';
                        const fieldError = rateErrors[pkg.id];
                        const parsedRate = parsedRates[pkg.id];
                        return (
                          <div key={pkg.id}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-medium text-foreground truncate">{pkg.name}</span>
                              <PackageInfoButton pkg={pkg} />
                            </div>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="e.g. 1850"
                              value={value}
                              onChange={(e) => handleRateChange(pkg.id, e.target.value)}
                              prefix={<span className="text-muted-foreground text-xs">₹</span>}
                              suffix={<span className="text-muted-foreground/80 text-xs">per sqft</span>}
                              error={fieldError ?? undefined}
                              required
                            />
                            {fieldError === BID_RATE_ERROR && (
                              <p className="text-xs text-amber-400">{BID_RATE_ERROR}</p>
                            )}
                            {parsedRate && isValidBidRate(parsedRate) && floorAreaSqft ? (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Estimated Total:{' '}
                                <span className="font-semibold text-emerald-400">
                                  {formatEstimatedTotalLabel(parsedRate, floorAreaSqft)}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500"
                      disabled={!canSubmit || loading}
                    >
                      {loading ? 'Placing bid...' : myCurrentBid ? 'Update My Bid →' : 'Place Bid →'}
                    </Button>
                  </form>
                </>
              ) : myCurrentBid ? (
                <div className="space-y-3">
                  <div className="w-full">
                    <PackageBidPriceList packageRates={myCurrentBid.package_rates ?? []} />
                  </div>
                  {myRank > 0 && (
                    <p className="text-xs text-violet-400 font-medium text-center">
                      You ranked #{myRank} when bidding closed
                    </p>
                  )}
                  <p className="text-center text-xs text-muted-foreground/80">
                    Submitted {formatRelativeTime(myCurrentBid.updated_at ?? myCurrentBid.created_at)} — bidding is now closed and rates can no longer be changed.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Bidding closed before you submitted a bid on this project.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div ref={leaderboardRef} className="min-w-0">
          <Card className={cn('h-full', !isBiddingOpen && 'opacity-95')}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Live Leaderboard
                </div>
                {isBiddingOpen && project?.bidding_ends_at && (
                  <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {bidsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
                  ))}
                </div>
              ) : bids.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-secondary/30 border border-border text-center">
                  <Trophy className="w-8 h-8 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">No Bids Yet</p>
                  <p className="text-xs text-muted-foreground">Be the first firm to submit competitive rates.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {bids.map((bid, index) => {
                      const isMe = bid.builder_id === firmId;
                      const isLowest = index === 0;
                      const firm = bid.builder_id ? firms[bid.builder_id] : undefined;
                      const rowName = isMe
                        ? safeCompanyName
                        : firm?.company_name ?? (bid.builder_id ? `Firm #${bid.builder_id.slice(-6).toUpperCase()}` : 'Firm');

                      return (
                        <motion.div
                          key={bid.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className={cn(
                            'relative flex flex-wrap items-center gap-3 px-3 py-3 rounded-lg border',
                            isLowest ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-secondary/30 border-border',
                            isMe && 'ring-1 ring-violet-500/40',
                          )}
                        >
                          {isLowest && (
                            <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-lg" />
                          )}

                          <div className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-md border text-xs font-bold flex items-center justify-center',
                            index === 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                              : index === 1 ? 'text-slate-300 bg-slate-500/10 border-slate-400/30'
                              : index === 2 ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                              : 'text-muted-foreground bg-secondary/30 border-border',
                          )}>
                            {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                          </div>

                          <FirmLogo
                            companyName={rowName}
                            logoUrl={isMe ? (logoUrl ?? firm?.logo_url) : firm?.logo_url}
                            size="md"
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{rowName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-muted-foreground/80" />
                              <p className="text-[10px] text-muted-foreground/80">
                                {formatRelativeTime(bid.created_at)}
                              </p>
                              {isMe && (
                                <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">You</span>
                              )}
                              {isLowest && (
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Lowest Bid 🏆</span>
                              )}
                            </div>
                          </div>

                          <div className="w-full sm:w-auto">
                            <PackageBidPriceList
                              packageRates={bid.package_rates ?? []}
                              highlight={isLowest}
                              align="end"
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, AlertCircle, Clock, Download, FileText,
} from 'lucide-react';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { FirmBidLeaderboard } from '@/components/firm/FirmBidLeaderboard';
import { useRealtimeFirmBids } from '@/lib/hooks/useRealtimeFirmBids';
import {
  getFinishingBadge,
  getProjectBudgetDisplay,
  getProjectFloorAreaDisplay,
} from '@/lib/project/display';
import {
  BID_RATE_ERROR,
  getBidRateFieldError,
  isValidBidRate,
  parseBidDbError,
  parseBidRateValue,
  sanitizeBidRateInput,
  validateSingleRate,
} from '@/lib/validation/singleRate';
import { formatEstimatedTotalLabel } from '@/lib/firm/bidDisplay';
import { submitFirmBidAction } from '@/app/actions/firmBid';
import { cn } from '@/lib/utils';
import type { Project, Bid } from '@/lib/types';

interface Props {
  project: Project;
  existingBid: Bid | null;
  firmId: string;
  companyName: string;
  logoUrl?: string | null;
}

export function FirmBiddingConsole({
  project,
  existingBid,
  firmId,
  companyName,
  logoUrl,
}: Props) {
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const { bids } = useRealtimeFirmBids(project.id);

  const initialRate = existingBid?.single_rate ?? existingBid?.total_sum_metric;
  const [rateInput, setRateInput] = useState(() =>
    initialRate ? String(Math.trunc(initialRate)) : '',
  );
  const [rateError, setRateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successRank, setSuccessRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGracePeriod = project.status === 'frozen_24h';
  const isBiddingOpen = project.status === 'active_24h' || isGracePeriod;
  const parsedRate = parseBidRateValue(rateInput);
  const canSubmit = isValidBidRate(parsedRate) && !rateError;

  const myCurrentBid = bids.find((b) => b.builder_id === firmId);
  const myRank = bids.findIndex((b) => b.builder_id === firmId) + 1;

  const finishingBadge = getFinishingBadge(project.finishing_level);
  const floorAreaDisplay = getProjectFloorAreaDisplay(project);
  const budgetDisplay = getProjectBudgetDisplay(project);

  useEffect(() => {
    if (!rateInput) {
      setRateError(null);
      return;
    }
    const value = parseBidRateValue(rateInput);
    setRateError(getBidRateFieldError(value));
  }, [rateInput]);

  function handleRateChange(raw: string) {
    setRateInput(sanitizeBidRateInput(raw));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateSingleRate(parsedRate);
    if (!validation.valid) {
      setRateError(validation.message);
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const bidId = existingBid?.id ?? myCurrentBid?.id ?? null;
    const result = await submitFirmBidAction(project.id, parsedRate!, bidId);

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

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/firm" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isGracePeriod ? (
              <Badge variant="indigo"><Clock className="w-3 h-3" /> Grace Period</Badge>
            ) : isBiddingOpen ? (
              <Badge variant="emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Auction
              </Badge>
            ) : (
              <Badge>Bidding Closed</Badge>
            )}
            <Badge variant="violet">Construction Firm</Badge>
          </div>
          <h1 className="text-lg font-bold text-foreground leading-snug">{project.title}</h1>
        </div>
      </div>

      {isGracePeriod ? (
        <>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80">
              Bidding has closed but you can still submit or update your bid during the grace period.
            </p>
          </div>
          {project.selection_ends_at && (
            <Card className="border-amber-500/20">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs text-amber-400 uppercase tracking-wider">Selection Period</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <CountdownTicker targetDateISO={project.selection_ends_at} />
              </CardContent>
            </Card>
          )}
        </>
      ) : project.status === 'active_24h' ? (
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
                <FirmLogo companyName={companyName} logoUrl={logoUrl} size="md" />
                <div>
                  <p className="text-sm font-bold text-foreground">{companyName}</p>
                  <p className="text-[10px] text-muted-foreground">Bidding as Construction Firm</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2 text-sm">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Project Summary</p>
                {project.building_types && project.building_types.length > 0 && (
                  <BuildingConfigSummary project={project} compact />
                )}
                {finishingBadge && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Finishing:</span>
                    <Badge className="text-[10px]">{finishingBadge}</Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Floor area: {floorAreaDisplay ?? 'Not specified by owner'}
                </p>
                <p className="text-xs text-muted-foreground">Location: {project.district}</p>
                {budgetDisplay && (
                  <p className="text-xs text-muted-foreground">Budget: {budgetDisplay}</p>
                )}
                {project.drawing_url ? (
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

              {isBiddingOpen ? (
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
                      <p className="text-sm font-semibold text-foreground">Your Rate</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enter your rate per square foot for the complete project (materials + labour included)
                      </p>
                    </div>

                    <Input
                      label="Rate per sqft"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="e.g. 1850"
                      value={rateInput}
                      onChange={(e) => handleRateChange(e.target.value)}
                      prefix={<span className="text-muted-foreground text-xs">₹</span>}
                      suffix={<span className="text-muted-foreground/80 text-xs">per sqft</span>}
                      error={rateError ?? undefined}
                      required
                    />
                    {rateError === BID_RATE_ERROR && (
                      <p className="text-xs text-amber-400">{BID_RATE_ERROR}</p>
                    )}

                    {parsedRate && isValidBidRate(parsedRate) && project.floor_area_sqft ? (
                      <p className="text-sm text-foreground">
                        Estimated Total:{' '}
                        <span className="font-bold text-emerald-400">
                          {formatEstimatedTotalLabel(parsedRate, project.floor_area_sqft)}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Total will depend on final floor area measurement
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500"
                      disabled={!canSubmit || loading}
                    >
                      {loading ? 'Placing bid...' : myCurrentBid ? 'Update My Bid →' : 'Place Bid →'}
                    </Button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Bid submission is closed for this project.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div ref={leaderboardRef} className="min-w-0">
          <Card className={cn('h-full', !isBiddingOpen && 'opacity-95')}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Live Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <FirmBidLeaderboard
                projectId={project.id}
                projectStatus={project.status}
                floorAreaSqft={project.floor_area_sqft}
                biddingEndsAt={project.bidding_ends_at}
                highlightFirmId={firmId}
                viewerCompanyName={companyName}
                assumeAuthenticated
                showViewProfile={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

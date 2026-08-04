'use client';

import { Lock, UserCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuctionCountdown } from '../../AuctionCountdown';
import { STATUS_CONFIG } from '@/lib/utils';
import { useOwnerProjectPhaseContext } from '@/lib/context/OwnerProjectPhaseContext';

interface BuilderInfo {
  id: string;
  full_name: string;
}

interface FirmInfo {
  id: string;
  company_name: string;
}

interface Props {
  isFirm: boolean;
  selectedBuilder?: BuilderInfo | null;
  selectedFirm?: FirmInfo | null;
}

export function OwnerProjectPhaseBadge({ isFirm }: { isFirm: boolean }) {
  const { project, phase, canSelect } = useOwnerProjectPhaseContext();

  if (phase === 'live') {
    return (
      <Badge variant="emerald" className="flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live Bidding
      </Badge>
    );
  }

  if (phase === 'select' && canSelect) {
    return (
      <Badge variant="indigo" className="flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        {isFirm ? 'Select Firm' : 'Select Builder'}
      </Badge>
    );
  }

  if (phase === 'done') {
    return (
      <Badge variant="default" className="flex-shrink-0">
        {STATUS_CONFIG[project.status].label}
      </Badge>
    );
  }

  return null;
}

export function OwnerProjectPhaseBody({
  isFirm,
  selectedBuilder,
  selectedFirm,
}: Props) {
  const { project, phase, canSelect } = useOwnerProjectPhaseContext();

  const winner = project.selected_builder_id
    ? (selectedFirm ?? selectedBuilder)
    : null;
  const winnerName =
    selectedFirm?.company_name ?? selectedBuilder?.full_name ?? null;

  return (
    <>
      {(phase === 'live' || canSelect || winner) && (
        <div className="flex flex-wrap items-start gap-4">
          {phase === 'live' && (
            <Card className="border-emerald-500/20 flex-shrink-0">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] text-emerald-400 uppercase tracking-wider">
                  Closes In
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <AuctionCountdown targetDateISO={project.bidding_ends_at} projectId={project.id} compact />
              </CardContent>
            </Card>
          )}

          {canSelect && project.selection_ends_at && (
            <Card className="border-amber-500/20 flex-shrink-0">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Selection Closes In
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <AuctionCountdown targetDateISO={project.selection_ends_at} projectId={project.id} compact />
              </CardContent>
            </Card>
          )}

          {winner && winnerName && (
            <Card className="border-emerald-500/30">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3" />
                  {isFirm ? 'Selected Firm' : 'Selected Builder'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm font-bold text-foreground">{winnerName}</p>
                {project.selected_package ? (
                  <p className="text-xs text-foreground mt-1 flex items-center gap-1.5">
                    <span className="font-semibold">{project.selected_package.package.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-bold text-emerald-400">
                      ₹{project.selected_package.rate.toLocaleString('en-IN')}/sqft
                    </span>
                  </p>
                ) : null}
                <p className="text-[10px] text-emerald-400 mt-0.5">✓ Contract awarded</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {canSelect && (
        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
          <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-300 mb-1">
              Bidding Closed — {isFirm ? 'Select Your Construction Firm' : 'Select Your Builder'}
            </p>
            <p className="text-xs text-indigo-400/70">
              {isFirm
                ? '🎉 Review firm bids below and select the company that best fits your project. BuilBid will arrange a meeting to finalize the construction agreement.'
                : 'Review all bids below and select the builder who best fits your project. Contact details remain private until you award the contract.'}
            </p>
          </div>
        </div>
      )}

      {phase === 'live' && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1.5 flex-shrink-0" />
          <p className="text-xs text-emerald-300">
            Live auction in progress. Builder names and profile photos are visible on the
            leaderboard; contact details stay private. Rankings update in real-time.
          </p>
        </div>
      )}
    </>
  );
}

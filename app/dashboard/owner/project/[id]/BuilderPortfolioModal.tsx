'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User, BadgeCheck, Calendar, Layers, TrendingDown,
  Trophy, Star, Building, Loader2, MapPin, Briefcase, MessageSquare,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { BuilderRatingBadge } from '@/components/shared/BuilderRatingBadge';
import { BuilderRatingBreakdown, BuilderReviewsFeed } from '@/components/shared/BuilderRatingBreakdown';
import { BuilderPortfolioGrid } from '@/components/shared/BuilderPortfolioGrid';
import { createClient } from '@/lib/supabase/client';
import { EMPTY_RATING_STATS, type BuilderRatingStats } from '@/lib/builderRatings';
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
  rank: number;
  currentProjectId: string;
  isProjectCompleted: boolean;
  isSelectedBuilder: boolean;
  ownerId: string;
}

interface WonProject {
  id: string;
  title: string;
  district: string;
  track_type: string;
  created_at: string;
}

interface BuilderRating {
  id: string;
  project_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

const FLOOR_LABELS: Record<string, string> = {
  ground_rate: 'Ground Floor',
  first_rate:  'First Floor',
  second_rate: 'Second Floor',
};

export function BuilderPortfolioModal({
  builder, bid, rank, currentProjectId, isProjectCompleted, isSelectedBuilder, ownerId,
}: PortfolioProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const [wonProjects, setWonProjects]       = useState<WonProject[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<BuilderPortfolioItem[]>([]);
  const [ratingStats, setRatingStats]       = useState<BuilderRatingStats>(EMPTY_RATING_STATS);
  const [myRating, setMyRating]             = useState<BuilderRating | null>(null);
  const [ratingInput, setRatingInput]       = useState(4);
  const [reviewInput, setReviewInput]       = useState('');
  const [saving, setSaving]                 = useState(false);
  const [saveSuccess, setSaveSuccess]       = useState(false);
  const [loadingData, setLoadingData]       = useState(false);

  const fetchPortfolio = useCallback(async () => {
    setLoadingData(true);

    const [projectsRes, portfolioRes, statsRes, myRatingRes] = await Promise.all([
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
      supabase.rpc('get_builder_rating_stats', { p_builder_id: builder.id }),
      supabase
        .from('builder_ratings')
        .select('id, project_id, rating, review, created_at')
        .eq('builder_id', builder.id)
        .eq('project_id', currentProjectId)
        .maybeSingle(),
    ]);

    setWonProjects((projectsRes.data ?? []) as WonProject[]);
    setPortfolioItems((portfolioRes.data ?? []) as BuilderPortfolioItem[]);

    if (statsRes.data && typeof statsRes.data === 'object') {
      setRatingStats(statsRes.data as BuilderRatingStats);
    } else {
      setRatingStats(EMPTY_RATING_STATS);
    }

    const existing = myRatingRes.data as BuilderRating | null;
    if (existing) {
      setMyRating(existing);
      setRatingInput(existing.rating);
      setReviewInput(existing.review ?? '');
    }

    setLoadingData(false);
  }, [builder.id, currentProjectId, supabase]);

  useEffect(() => {
    if (open) fetchPortfolio();
  }, [open, fetchPortfolio]);

  const { average, total } = ratingStats;

  async function handleSaveRating() {
    setSaving(true);
    const payload = {
      project_id:  currentProjectId,
      builder_id:  builder.id,
      owner_id:    ownerId,
      rating:      ratingInput,
      review:      reviewInput.trim() || null,
    };

    const { data, error } = myRating
      ? await supabase.from('builder_ratings').update(payload).eq('id', myRating.id).select().single()
      : await supabase.from('builder_ratings').insert(payload).select().single();

    if (!error && data) {
      setMyRating(data as BuilderRating);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchPortfolio();
    }
    setSaving(false);
  }

  const rateEntries = Object.entries(bid.rates).filter(
    ([, val]) => val !== undefined && val !== null && (val as number) > 0
  ) as [string, number][];

  const memberSince = new Date(builder.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long',
  });

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
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <BuilderRatingBadge average={average} total={total} size="md" showCount />
                <span className="text-[11px] text-muted-foreground/80">Rank #{rank} on this project</span>
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
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border">
                <Trophy className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-base font-bold text-foreground">{wonProjects.length}</p>
                <p className="text-[10px] text-muted-foreground">Projects Won</p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border">
                <Star className="w-4 h-4 text-amber-400 mb-1 fill-amber-400" />
                <p className="text-base font-bold text-foreground">
                  {total > 0 ? average.toFixed(1) : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">Avg Rating</p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border">
                <Calendar className="w-4 h-4 text-indigo-400 mb-1" />
                <p className="text-[11px] font-bold text-foreground text-center leading-tight">{memberSince}</p>
                <p className="text-[10px] text-muted-foreground">Member Since</p>
              </div>
            </div>

            {builder.is_verified && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-emerald-300">Verified builder account</span>
              </div>
            )}

            {/* Phase B: Play Store-style ratings */}
            <div className="rounded-xl border border-border bg-card/80 dark:bg-card/60 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <p className="text-sm font-semibold text-foreground">
                  Ratings &amp; Reviews
                  {total > 0 && (
                    <span className="text-muted-foreground font-normal ml-1.5">
                      — {average.toFixed(1)} out of 5
                    </span>
                  )}
                </p>
              </div>
              <BuilderRatingBreakdown stats={ratingStats} />
            </div>

            {/* Owner feedback feed */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Client Feedback
                </p>
              </div>
              <BuilderReviewsFeed reviews={ratingStats.reviews} />
            </div>

            {/* Portfolio section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Portfolio ({portfolioItems.length})
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
                {rateEntries.map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 border border-border">
                    <span className="text-xs text-muted-foreground">{FLOOR_LABELS[key] ?? key}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">₹{val.toLocaleString('en-IN')}/sqft</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 mt-1">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-sm font-semibold text-foreground">Total Rate Metric</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-300 tabular-nums">
                    ₹{bid.total_sum_metric.toLocaleString('en-IN')}/sqft
                  </span>
                </div>
              </div>
            </div>

            {/* Won projects */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Winning Bids ({wonProjects.length})
                </p>
              </div>
              {wonProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground/80 px-2">No completed projects yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {wonProjects.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <Building className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-muted-foreground/80" />
                          <span className="text-[10px] text-muted-foreground">{p.district}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-medium">Won</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rate builder — only after awarding contract on completed project */}
            {isProjectCompleted && isSelectedBuilder && (
              <div className="border-t border-border pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-sm font-semibold text-foreground">
                    {myRating ? 'Update Your Rating' : 'Rate This Builder'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <StarRating
                      rating={ratingInput}
                      interactive
                      size="md"
                      onRate={setRatingInput}
                    />
                    <span className="text-sm text-muted-foreground">{ratingInput}/5</span>
                  </div>
                  <textarea
                    value={reviewInput}
                    onChange={(e) => setReviewInput(e.target.value)}
                    placeholder="Share your experience working with this builder (optional)…"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                  <Button
                    onClick={handleSaveRating}
                    disabled={saving}
                    size="sm"
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      '✓ Saved!'
                    ) : myRating ? (
                      'Update Rating'
                    ) : (
                      'Submit Rating'
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground/80 text-center">
              Contact details (phone, email, address) are never shown here — shared only after contract confirmation.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '../supabase/client';
import type { Bid } from '../types';
import { sortBidsByEstimatedCost, type BidRankContext } from '../bid/estimatedCost';

export function useRealtimeBids(projectId: string, rankContext?: BidRankContext | null) {
  const [rawBids, setRawBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBids = useCallback(async () => {
    const { data, error } = await supabase
      .from('bids_public')
      .select('*')
      .eq('project_id', projectId)
      .order('total_sum_metric', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setRawBids((data ?? []) as Bid[]);
    }
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchBids();

    const channel = supabase
      .channel(`bids:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchBids();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchBids, supabase]);

  const bids = useMemo(
    () => sortBidsByEstimatedCost(rawBids, rankContext),
    [rawBids, rankContext],
  );

  return { bids, loading, error };
}

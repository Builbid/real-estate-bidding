'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../supabase/client';
import type { Bid } from '../types';

/**
 * Realtime bids for construction firm projects — separate from useRealtimeBids
 * so labour contractor subscriptions remain unchanged.
 */
export function useRealtimeFirmBids(projectId: string) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBids = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('bids_public')
      .select('*')
      .eq('project_id', projectId)
      .order('total_sum_metric', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const firmBids = ((data ?? []) as Bid[]).filter(
        (b) => b.service_type === 'construction_firm' || b.single_rate != null,
      );
      setBids(firmBids);
    }
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchBids();

    const channel = supabase
      .channel(`firm-bids:${projectId}`)
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

  return { bids, loading, error, refetch: fetchBids };
}

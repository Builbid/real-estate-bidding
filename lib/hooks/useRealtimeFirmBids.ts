'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../supabase/client';
import { sanitizeFirmBid } from '@/lib/firm/sanitizeProject';
import type { Bid } from '../types';

const BID_COLUMNS_BASE =
  'id, project_id, rates, total_sum_metric, created_at, updated_at, builder_id';
const BID_COLUMNS_EXTENDED = `${BID_COLUMNS_BASE}, single_rate, service_type, package_rates`;

/**
 * Realtime bids for construction firm projects — separate from useRealtimeBids
 * so labour contractor subscriptions remain unchanged.
 */
export function useRealtimeFirmBids(projectId: string) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchBids = useCallback(async () => {
    const supabase = supabaseRef.current;

    const extended = await supabase
      .from('bids_public')
      .select(BID_COLUMNS_EXTENDED)
      .eq('project_id', projectId)
      .order('total_sum_metric', { ascending: true });

    const response = extended.error
      ? await supabase
          .from('bids_public')
          .select(BID_COLUMNS_BASE)
          .eq('project_id', projectId)
          .order('total_sum_metric', { ascending: true })
      : extended;

    if (response.error) {
      setError(response.error.message);
      setBids([]);
    } else {
      setError(null);
      const rows = (response.data ?? []) as Record<string, unknown>[];
      setBids(
        rows
          .map((row) => sanitizeFirmBid(row))
          .filter((b): b is Bid => b != null),
      );
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchBids();

    const supabase = supabaseRef.current;
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
  }, [projectId, fetchBids]);

  return { bids, loading, error, refetch: fetchBids };
}

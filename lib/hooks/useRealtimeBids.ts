'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../supabase/client';
import type { Bid } from '../types';

export function useRealtimeBids(projectId: string) {
  const [bids, setBids]       = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

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
      setBids((data ?? []) as Bid[]);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchBids, supabase]);

  return { bids, loading, error };
}

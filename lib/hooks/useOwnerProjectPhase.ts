'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { triggerProjectTransition } from '@/app/actions/auction';
import { getProjectPhase, type ProjectPhase } from '@/lib/utils';
import type { Project, ProjectStatus } from '@/lib/types';

const SELECTION_WINDOW_MS = 5 * 60 * 1000;

function deriveOwnerPhase(project: Project, biddingHasEnded: boolean): ProjectPhase {
  if (project.status === 'completed' || project.status === 'cancelled') return 'done';
  if (project.status === 'frozen_24h') return 'select';
  if (project.status === 'active_24h') {
    return biddingHasEnded ? 'select' : 'live';
  }
  return getProjectPhase(project);
}

/** Keeps owner project phase in sync without a manual page refresh. */
export function useOwnerProjectPhase(initialProject: Project) {
  const [project, setProject] = useState(initialProject);
  const transitionStartedRef = useRef(false);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    transitionStartedRef.current = false;
  }, [project.id]);

  const { isExpired: biddingHasEnded } = useCountdown(project.bidding_ends_at);

  const phase = useMemo(
    () => deriveOwnerPhase(project, biddingHasEnded),
    [project, biddingHasEnded],
  );

  const canSelect = useMemo(
    () =>
      biddingHasEnded &&
      !project.selected_builder_id &&
      project.status !== 'completed' &&
      project.status !== 'cancelled',
    [biddingHasEnded, project],
  );

  const isReveal = biddingHasEnded;
  const isFrozen = canSelect || project.status === 'frozen_24h';

  useEffect(() => {
    if (!biddingHasEnded || project.status !== 'active_24h') return;
    if (transitionStartedRef.current) return;
    transitionStartedRef.current = true;

    setProject((prev) => {
      if (prev.status !== 'active_24h') return prev;
      return {
        ...prev,
        status: 'frozen_24h' as ProjectStatus,
        selection_ends_at:
          prev.selection_ends_at ?? new Date(Date.now() + SELECTION_WINDOW_MS).toISOString(),
      };
    });

    void triggerProjectTransition(project.id).finally(() => {
      transitionStartedRef.current = false;
    });
  }, [biddingHasEnded, project.status, project.id]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`owner-project:${project.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${project.id}`,
        },
        (payload) => {
          setProject((prev) => ({ ...prev, ...(payload.new as Project) }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id]);

  return {
    project,
    phase,
    canSelect,
    isReveal,
    isFrozen,
    biddingHasEnded,
  };
}

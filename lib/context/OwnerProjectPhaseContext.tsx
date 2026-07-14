'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useOwnerProjectPhase } from '@/lib/hooks/useOwnerProjectPhase';
import type { Project } from '@/lib/types';
import type { ProjectPhase } from '@/lib/utils';

interface OwnerProjectPhaseContextValue {
  project: Project;
  phase: ProjectPhase;
  canSelect: boolean;
  isReveal: boolean;
  isFrozen: boolean;
  biddingHasEnded: boolean;
}

const OwnerProjectPhaseContext = createContext<OwnerProjectPhaseContextValue | null>(null);

export function OwnerProjectPhaseProvider({
  initialProject,
  children,
}: {
  initialProject: Project;
  children: ReactNode;
}) {
  const value = useOwnerProjectPhase(initialProject);
  return (
    <OwnerProjectPhaseContext.Provider value={value}>
      {children}
    </OwnerProjectPhaseContext.Provider>
  );
}

export function useOwnerProjectPhaseContext(): OwnerProjectPhaseContextValue {
  const ctx = useContext(OwnerProjectPhaseContext);
  if (!ctx) {
    throw new Error('useOwnerProjectPhaseContext must be used within OwnerProjectPhaseProvider');
  }
  return ctx;
}

/** Uses shared provider state when available, otherwise runs its own subscription. */
export function useOwnerProjectPhaseState(initialProject: Project): OwnerProjectPhaseContextValue {
  const ctx = useContext(OwnerProjectPhaseContext);
  const local = useOwnerProjectPhase(initialProject);
  return ctx ?? local;
}

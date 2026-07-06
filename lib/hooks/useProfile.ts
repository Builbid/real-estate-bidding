'use client';

import { useOptionalProfileUpdate } from '../context/ProfileProvider';

/** Profile from dashboard ProfileProvider — never throws. */
export function useProfile() {
  const ctx = useOptionalProfileUpdate();
  return {
    profile: ctx?.profile ?? null,
    loading: ctx?.loading ?? false,
    clearProfile: ctx?.clearProfile ?? (() => {}),
  };
}

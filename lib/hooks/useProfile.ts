'use client';

import { useOptionalProfileUpdate } from '../context/ProfileProvider';

export function useProfile() {
  const ctx = useOptionalProfileUpdate();
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return {
    profile: ctx.profile,
    loading: ctx.loading,
    clearProfile: ctx.clearProfile,
  };
}

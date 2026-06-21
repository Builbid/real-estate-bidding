'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../supabase/client';
import type { Profile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data as Profile | null);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return { profile, loading };
}

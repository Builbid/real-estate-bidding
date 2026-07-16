'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Warm signup sub-routes as soon as any /signup/* page mounts. */
export function SignupRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/signup/client');
    router.prefetch('/signup/provider');
    router.prefetch('/register');
    router.prefetch('/signup/bidder/labour-contractor');
    router.prefetch('/signup/bidder/construction-firm');
    router.prefetch('/signup/project-owner');
  }, [router]);

  return null;
}

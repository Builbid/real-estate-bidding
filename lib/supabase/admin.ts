import { createClient } from '@supabase/supabase-js';

/**
 * Server-only admin client using the Service Role key.
 * This bypasses ALL Row Level Security policies.
 * Use ONLY on the server side for privileged reads (e.g. fetching
 * builder profiles to reveal identities to a project owner).
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!secret) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment variables.'
    );
  }

  return createClient(url, secret, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
  });
}

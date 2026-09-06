import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  BUILBID_OFFICIAL_ADMIN_EMAIL,
  isOfficialAdminEmail,
} from '@/lib/admin/constants';

export interface OfficialAdminSession {
  userId: string;
  email: string;
}

/**
 * Require an authenticated session for the official BuilBid admin email.
 * Redirects to /admin/login when unauthorized.
 */
export async function requireOfficialAdmin(): Promise<OfficialAdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !isOfficialAdminEmail(user.email)) {
    redirect('/admin/login');
  }

  // Keep profile flags in sync for RLS helpers (best-effort).
  await supabase
    .from('profiles')
    .update({
      is_admin: true,
      role: 'admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .eq('email', BUILBID_OFFICIAL_ADMIN_EMAIL);

  return {
    userId: user.id,
    email: BUILBID_OFFICIAL_ADMIN_EMAIL,
  };
}

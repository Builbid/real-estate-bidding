import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  BUILBID_OFFICIAL_ADMIN_EMAIL,
  isActiveTestingSupervisor,
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

  if (!user?.id) {
    redirect('/admin/login');
  }

  if (!isOfficialAdminEmail(user.email)) {
    // TESTING: verified field supervisors enter the dashboard without an approval hold.
    // Re-enable interview / pending review before official production.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_verified, staff_position')
      .eq('id', user.id)
      .maybeSingle();

    if (!isActiveTestingSupervisor(profile) || !user.email) {
      redirect('/admin/login');
    }

    return {
      userId: user.id,
      email: user.email,
    };
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

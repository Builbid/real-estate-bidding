export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDashboardPath, roleFromUserMetadata } from '@/lib/auth/roles';

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.id) redirect('/login');

  // Database role is authoritative; JWT metadata can be stale.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role) {
    redirect(getDashboardPath(profile.role));
  }

  const metaRole = roleFromUserMetadata(user.user_metadata as Record<string, unknown>);
  redirect(getDashboardPath(metaRole));
}

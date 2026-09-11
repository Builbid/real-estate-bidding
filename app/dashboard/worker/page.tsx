export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { getDashboardPath, isBidderRole, normalizeRole } from '@/lib/auth/roles';

export default async function WorkerDashboardRedirect() {
  const { role } = await getAuthUser();
  const normalized = normalizeRole(role);
  if (!isBidderRole(normalized)) redirect('/dashboard');
  redirect(getDashboardPath(normalized));
}

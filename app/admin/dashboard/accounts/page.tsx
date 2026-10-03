import { redirect } from 'next/navigation';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { loadAdminDashboardData, loadSupervisorAccount } from '@/lib/admin/data';
import { loadSupervisorTerritory, worksInTerritory } from '@/lib/admin/territory';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadSupervisorProfileDetailsAction } from '@/app/admin/supervisor-actions';
import { SupervisorAccountsView } from '@/components/admin/SupervisorAccountsView';

export const dynamic = 'force-dynamic';

/** Dedicated full-page "Profile & Accounts" view for supervisors (replaces the old pop-up). */
export default async function SupervisorAccountsPage() {
  const session = await requireOfficialAdmin();
  if (isOfficialAdminEmail(session.email)) redirect('/admin/dashboard');

  const [assignedPincodes, data, profile] = await Promise.all([
    loadSupervisorTerritory(createAdminClient(), session.userId),
    loadAdminDashboardData({ territory: null }),
    loadSupervisorProfileDetailsAction(),
  ]);

  const account = await loadSupervisorAccount(
    session.userId,
    session.email,
    worksInTerritory(data.completedWorks, assignedPincodes),
    assignedPincodes.length,
  );

  return (
    <SupervisorAccountsView
      account={account}
      details={'details' in profile ? profile.details : null}
      error={'error' in profile ? profile.error : null}
    />
  );
}

import { redirect } from 'next/navigation';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { loadAdminDashboardData, loadSupervisorAccount } from '@/lib/admin/data';
import { BYPASS_PINCODE_RESTRICTION, loadSupervisorTerritory, worksInTerritory } from '@/lib/admin/territory';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadSupervisorProfileDetailsAction } from '@/app/admin/supervisor-actions';
import { SupervisorAccountsView } from '@/components/admin/SupervisorAccountsView';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Dedicated full-page "Profile & Accounts" view for supervisors (replaces the old pop-up). */
export default async function SupervisorAccountsPage() {
  const session = await requireOfficialAdmin();
  if (isOfficialAdminEmail(session.email)) redirect('/admin/dashboard');

  const [assignedPincodes, data, profile] = await Promise.all([
    loadSupervisorTerritory(createAdminClient(), session.userId),
    loadAdminDashboardData({ territory: null, supervisorView: true }),
    loadSupervisorProfileDetailsAction(),
  ]);

  const earningWorks = BYPASS_PINCODE_RESTRICTION
    ? data.completedWorks
    : worksInTerritory(data.completedWorks, assignedPincodes);
  const account = await loadSupervisorAccount(
    session.userId,
    session.email,
    earningWorks,
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

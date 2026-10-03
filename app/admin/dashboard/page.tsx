import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import {
  loadAdminDashboardData,
  loadAdminSupervisors,
  loadSupervisorAccount,
  type AdminTab,
} from '@/lib/admin/data';
import {
  BYPASS_PINCODE_RESTRICTION,
  loadSupervisorTerritory,
  worksInTerritory,
} from '@/lib/admin/territory';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminDashboardClient } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

const ADMIN_TABS: AdminTab[] = ['overview', 'projects', 'workers', 'clients', 'agreements', 'supervisors'];
const SUPERVISOR_TABS: AdminTab[] = ['overview', 'projects', 'agreements', 'completed'];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireOfficialAdmin();
  const supervisorPortal = !isOfficialAdminEmail(session.email);

  // Normally supervisors only see projects inside their assigned pin code territory.
  // TEMPORARY: BYPASS_PINCODE_RESTRICTION lifts the filter so every project is visible.
  const assignedPincodes = supervisorPortal
    ? await loadSupervisorTerritory(createAdminClient(), session.userId)
    : null;
  const territory = BYPASS_PINCODE_RESTRICTION ? null : assignedPincodes;

  const data = await loadAdminDashboardData({ territory, supervisorView: supervisorPortal });
  const account = supervisorPortal
    ? await loadSupervisorAccount(
        session.userId,
        session.email,
        // Visibility is open for testing, but the supervisor's own commission estimate still
        // only counts completed works inside their assigned pin codes.
        worksInTerritory(data.completedWorks, assignedPincodes ?? []),
        assignedPincodes?.length ?? 0,
      )
    : null;
  const supervisors = supervisorPortal ? [] : await loadAdminSupervisors();
  const params = await searchParams;
  const allowed = supervisorPortal ? SUPERVISOR_TABS : ADMIN_TABS;
  const tab = allowed.includes(params.tab as AdminTab) ? (params.tab as AdminTab) : 'overview';

  return (
    <AdminDashboardClient
      email={session.email}
      supervisorPortal={supervisorPortal}
      account={account}
      kpis={data.kpis}
      projects={data.projects}
      workers={supervisorPortal ? [] : data.workers}
      clients={supervisorPortal ? [] : data.clients}
      agreements={data.agreements}
      completedWorks={data.completedWorks}
      supervisors={supervisors}
      initialTab={tab}
    />
  );
}

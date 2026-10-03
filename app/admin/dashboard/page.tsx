import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import {
  loadAdminDashboardData,
  loadAdminSupervisors,
  loadSupervisorAccount,
  type AdminTab,
} from '@/lib/admin/data';
import { loadSupervisorTerritory } from '@/lib/admin/territory';
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

  // Supervisors only ever see projects inside their assigned pin code territory.
  const territory = supervisorPortal
    ? await loadSupervisorTerritory(createAdminClient(), session.userId)
    : null;

  const data = await loadAdminDashboardData({ territory });
  const account = supervisorPortal
    ? await loadSupervisorAccount(
        session.userId,
        session.email,
        data.completedWorks,
        territory?.length ?? 0,
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

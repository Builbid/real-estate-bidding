import { requireOfficialAdmin } from '@/lib/admin/auth';
import { loadAdminDashboardData } from '@/lib/admin/data';
import { AdminDashboardClient } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await requireOfficialAdmin();
  const data = await loadAdminDashboardData();

  return (
    <AdminDashboardClient
      email={session.email}
      kpis={data.kpis}
      projects={data.projects}
      workers={data.workers}
      clients={data.clients}
      agreements={data.agreements}
    />
  );
}

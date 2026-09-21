import { requireOfficialAdmin } from '@/lib/admin/auth';
import { loadAdminDashboardData, type AdminTab } from '@/lib/admin/data';
import { AdminDashboardClient } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

const TABS: AdminTab[] = ['overview', 'projects', 'workers', 'clients', 'agreements'];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireOfficialAdmin();
  const data = await loadAdminDashboardData();
  const params = await searchParams;
  const tab = TABS.includes(params.tab as AdminTab) ? (params.tab as AdminTab) : 'overview';

  return (
    <AdminDashboardClient
      email={session.email}
      kpis={data.kpis}
      projects={data.projects}
      workers={data.workers}
      clients={data.clients}
      agreements={data.agreements}
      initialTab={tab}
    />
  );
}

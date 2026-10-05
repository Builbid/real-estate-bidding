import { requireOfficialAdmin } from '@/lib/admin/auth';
import { SiteVisitChecklistPage } from '@/components/admin/SiteVisitChecklistPage';

export const dynamic = 'force-dynamic';

export default async function AdminChecklistPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireOfficialAdmin();
  const { projectId } = await params;
  return <SiteVisitChecklistPage projectId={decodeURIComponent(projectId)} />;
}

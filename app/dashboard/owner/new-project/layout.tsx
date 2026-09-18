import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/getUser';
import {
  canPostProjects,
  getDashboardPath,
  isContractorWorkerRole,
} from '@/lib/auth/roles';
import { NewProjectContractorBlocked } from '@/components/auth/NewProjectContractorBlocked';

export default async function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getAuthUser();

  if (isContractorWorkerRole(role)) {
    return <NewProjectContractorBlocked dashboardHref={getDashboardPath(role)} />;
  }

  if (!canPostProjects(role)) {
    redirect(getDashboardPath(role));
  }

  return children;
}

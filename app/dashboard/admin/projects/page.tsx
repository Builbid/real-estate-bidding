import { redirect } from 'next/navigation';

export default function DashboardAdminProjectsRedirectPage() {
  redirect('/admin/dashboard?tab=projects');
}

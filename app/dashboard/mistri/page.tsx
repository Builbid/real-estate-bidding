import { redirect } from 'next/navigation';

/** Alias: /dashboard/mistri -> the worker dashboard router (role-checked by the proxy). */
export default function MistriDashboardAlias() {
  redirect('/dashboard/worker');
}


import { redirect } from 'next/navigation';

/**
 * Legacy trade-provider dashboard. Worker accounts are now unified, so every
 * Worker (whatever trade they originally registered with) uses the single
 * Worker Dashboard with access to all project categories.
 */
export default function ProviderDashboardAlias() {
  redirect('/dashboard/builder');
}

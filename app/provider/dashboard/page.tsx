import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProviderDashboardClient } from '@/components/provider/ProviderDashboardClient';
import type { CallbackRequest, ServiceCategory, ServiceProvider } from '@/lib/types/hireServices';

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/provider/dashboard');

  const [{ data: providerRow }, { data: categories }, { data: callbacks }] = await Promise.all([
    supabase.from('service_providers').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('service_categories').select('*').order('name'),
    supabase
      .from('callback_requests')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!providerRow) {
    redirect('/signup/provider');
  }

  return (
    <ProviderDashboardClient
      provider={providerRow as ServiceProvider}
      categories={(categories ?? []) as ServiceCategory[]}
      callbacks={(callbacks ?? []) as CallbackRequest[]}
    />
  );
}

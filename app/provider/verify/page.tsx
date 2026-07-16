import { createClient } from '@/lib/supabase/server';
import { ProviderVerifyClient } from '@/components/provider/ProviderVerifyClient';
import type { ServiceProvider } from '@/lib/types/hireServices';

export default async function ProviderVerifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = user
    ? await supabase.from('service_providers').select('*').eq('id', user.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Optional verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload ID and sample work to earn a Verified badge. This is not required to receive callbacks.
        </p>
      </div>
      {user ? (
        <ProviderVerifyClient userId={user.id} provider={(provider as ServiceProvider) ?? null} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to submit verification.</p>
      )}
    </div>
  );
}

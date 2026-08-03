export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { FirmPortfolioManager } from '@/components/firm/FirmPortfolioManager';
import { FirmProfileSettings } from '@/components/firm/FirmProfileSettings';

export default async function FirmSettingsPage() {
  const { supabase, userId, role } = await getAuthUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if ((profile?.role ?? role) !== 'construction_firm') redirect('/dashboard');

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Firm Profile & Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company details and portfolio
        </p>
      </div>

      <FirmProfileSettings
        companyName={profile?.company_name ?? ''}
        gstNumber={profile?.gst_number ?? ''}
        yearsInBusiness={profile?.years_in_business ?? null}
        classPackages={profile?.construction_class_packages ?? null}
        logoUrl={profile?.logo_url ?? null}
        fullName={profile?.full_name ?? ''}
      />

      <FirmPortfolioManager />
    </div>
  );
}

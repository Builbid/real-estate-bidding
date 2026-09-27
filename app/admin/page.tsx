import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActiveTestingSupervisor, isOfficialAdminEmail } from '@/lib/admin/constants';

export const dynamic = 'force-dynamic';

/** /admin → dashboard or login */
export default async function AdminIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isOfficialAdminEmail(user.email)) {
    redirect('/admin/dashboard');
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_verified, staff_position')
      .eq('id', user.id)
      .maybeSingle();
    if (isActiveTestingSupervisor(profile)) {
      redirect('/admin/dashboard');
    }
  }

  redirect('/admin/login');
}

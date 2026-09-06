import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';

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
  redirect('/admin/login');
}

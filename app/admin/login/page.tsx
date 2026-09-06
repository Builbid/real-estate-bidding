import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isOfficialAdminEmail(user.email)) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AdminLoginForm />
    </div>
  );
}

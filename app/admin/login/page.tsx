import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { isActiveTestingSupervisor, isOfficialAdminEmail } from '@/lib/admin/constants';
import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;
  const registrationNotice =
    params.registered === '1'
      ? 'Registration successful! Please login with your credentials.'
      : null;

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <HistoryBackButton className="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white" />
        <AdminLoginForm registrationNotice={registrationNotice} />
      </div>
    </div>
  );
}

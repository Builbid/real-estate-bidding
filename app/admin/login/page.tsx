import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Home
      </Link>
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <AdminLoginForm />
      </div>
    </div>
  );
}

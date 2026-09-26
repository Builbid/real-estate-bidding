import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminSignupForm } from './AdminSignupForm';

export const dynamic = 'force-dynamic';

export default function AdminSignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Login
        </Link>
        <AdminSignupForm />
      </div>
    </div>
  );
}

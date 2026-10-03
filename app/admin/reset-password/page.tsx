import { AdminResetPasswordForm } from './AdminResetPasswordForm';

export const dynamic = 'force-dynamic';

/** Reached from the emailed reset link. The proxy requires a valid supervisor recovery session. */
export default function AdminResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <AdminResetPasswordForm />
      </div>
    </div>
  );
}

import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { AdminForgotPasswordForm } from './AdminForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default async function AdminForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <HistoryBackButton className="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white" />
        <AdminForgotPasswordForm initialEmail={typeof email === 'string' ? email : ''} />
      </div>
    </div>
  );
}

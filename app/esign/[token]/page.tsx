import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { loadEsignSession } from '@/app/esign/actions';
import { EsignVerifyForm } from './EsignVerifyForm';

export const dynamic = 'force-dynamic';

export default async function EsignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const loaded = await loadEsignSession(token);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="flex items-center gap-2">
          <BuilBidLogo size="sm" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Dual Aadhaar eSign
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Review &amp; eSign Contract Agreement
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Confirm the draft emailed to you, then enter the OTP to Digitally Sign via Aadhaar eSign.
          </p>
          {loaded.error || !loaded.session ? (
            <p className="mt-6 text-sm text-red-600">{loaded.error || 'Unable to load this eSign request.'}</p>
          ) : (
            <div className="mt-6">
              <EsignVerifyForm token={token} session={loaded.session} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

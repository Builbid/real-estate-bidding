'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyDigitalContractOtpAction, type EsignSessionView } from '@/app/esign/actions';

export function EsignVerifyForm({ token, session }: { token: string; session: EsignSessionView }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [signed, setSigned] = useState(session.alreadySigned);
  const [bothSigned, setBothSigned] = useState(session.bothSigned);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await verifyDigitalContractOtpAction(token, otp);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSigned(true);
      setBothSigned(Boolean(result.bothSigned));
      setMessage(result.message ?? 'Aadhaar eSign recorded.');
    });
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        {Object.entries(session.summary).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Signing as</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {session.partyRole === 'client' ? 'Client / Homeowner' : 'Contractor / Mistri'} — {session.partyName}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Aadhaar</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{session.aadhaarMasked}</dd>
        </div>
      </dl>

      {signed ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Digitally Signed via Aadhaar eSign
          </p>
          <p className="mt-1 text-xs">
            {message ||
              (bothSigned
                ? 'Both parties have signed. The final PDF has been emailed.'
                : 'Waiting for the other party to complete their OTP eSign.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            label="Enter 6-digit eSign OTP"
            accentLabel={false}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Button type="button" className="w-full" onClick={submit} disabled={pending}>
            {pending ? 'Verifying…' : 'Confirm Aadhaar eSign'}
          </Button>
        </div>
      )}
    </div>
  );
}

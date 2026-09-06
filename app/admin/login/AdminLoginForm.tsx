'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, KeyRound, Mail, Shield } from 'lucide-react';
import {
  sendOfficialAdminOtpAction,
  verifyOfficialAdminOtpAction,
} from '@/app/admin/otp-actions';
import {
  ADMIN_UNAUTHORIZED_MESSAGE,
  BUILBID_OFFICIAL_ADMIN_EMAIL,
  isOfficialAdminEmail,
} from '@/lib/admin/constants';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Step = 'email' | 'otp';

export function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const trimmed = email.trim().toLowerCase();
    if (!isOfficialAdminEmail(trimmed)) {
      setError(ADMIN_UNAUTHORIZED_MESSAGE);
      return;
    }

    setPending(true);
    const result = await sendOfficialAdminOtpAction(BUILBID_OFFICIAL_ADMIN_EMAIL);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setEmail(BUILBID_OFFICIAL_ADMIN_EMAIL);
    setInfo(
      `OTP sent to ${BUILBID_OFFICIAL_ADMIN_EMAIL} via BuilBid mail. Check inbox and spam.`,
    );
    setStep('otp');
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await verifyOfficialAdminOtpAction(otp);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.replace('/admin/dashboard');
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-8 flex flex-col items-center text-center">
        <BuilBidLogo size="md" />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Shield className="h-3.5 w-3.5" />
          Official Staff Portal
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Secure admin access
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          OTP is emailed through BuilBid Gmail SMTP (not Supabase default mail).
        </p>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {info ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-email"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              Staff email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="builbidcorp@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Sending code…' : 'Send OTP'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Code sent to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {BUILBID_OFFICIAL_ADMIN_EMAIL}
            </span>
          </p>
          <div className="space-y-1.5">
            <label
              htmlFor="admin-otp"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              6-digit OTP
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="admin-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-10 tracking-[0.35em] font-mono text-center text-lg"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending || otp.length !== 6}>
            {pending ? 'Verifying…' : 'Verify & enter portal'}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            onClick={() => {
              setStep('email');
              setOtp('');
              setError(null);
              setInfo(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}

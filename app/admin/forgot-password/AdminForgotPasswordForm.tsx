'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { requestSupervisorPasswordResetAction } from '@/app/admin/otp-actions';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminForgotPasswordForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }

    setPending(true);
    const result = await requestSupervisorPasswordResetAction(trimmed);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-6 flex flex-col items-center text-center">
        <BuilBidLogo size="md" />
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Forgot password?
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your supervisor email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {sent ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Check your email</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              If a supervisor account exists for{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{email.trim()}</span>, we
              sent a password reset link. It may take a minute to arrive — check Spam too.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin/login">Back to login</Link>
          </Button>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex w-full flex-col gap-1">
              <label
                htmlFor="admin-reset-email"
                className="block text-left text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400"
              >
                EMAIL
              </label>
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-11 w-10 items-center justify-center text-slate-400">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <Input
                  id="admin-reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  compact
                  required
                  disabled={pending}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Sending link…' : 'Send reset link'}
            </Button>
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </form>
        </>
      )}
    </div>
  );
}

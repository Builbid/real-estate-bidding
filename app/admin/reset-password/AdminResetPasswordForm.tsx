'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

const FIELD_LABEL =
  'block text-left text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400';

export function AdminResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    // Admin namespace only — this never touches an Owner or Mistri session.
    const supabase = createClient('admin');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || 'Could not update your password. Request a new link.');
      setPending(false);
      return;
    }

    // End the recovery session so the supervisor signs in normally with the new password.
    await supabase.auth.signOut({ scope: 'local' });
    window.location.replace('/admin/login?reset=1');
  }

  const type = showPassword ? 'text' : 'password';
  const toggle = (
    <button
      type="button"
      onClick={() => setShowPassword((visible) => !visible)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
      className="absolute right-0 top-0 z-10 flex h-11 w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none dark:hover:text-slate-200"
    >
      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
    </button>
  );

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-6 flex flex-col items-center text-center">
        <BuilBidLogo size="md" />
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose a new password for your supervisor account.
        </p>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="admin-new-password" className={FIELD_LABEL}>
            NEW PASSWORD
          </label>
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-11 w-10 items-center justify-center text-slate-400">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <Input
              id="admin-new-password"
              type={type}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              compact
              required
              minLength={8}
              disabled={pending}
            />
            {toggle}
          </div>
        </div>

        <div className="flex w-full flex-col gap-1">
          <label htmlFor="admin-confirm-password" className={FIELD_LABEL}>
            CONFIRM PASSWORD
          </label>
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-11 w-10 items-center justify-center text-slate-400">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <Input
              id="admin-confirm-password"
              type={type}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-10"
              compact
              required
              minLength={8}
              disabled={pending}
            />
          </div>
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={pending}>
          {pending ? 'Updating…' : 'Update password'}
        </Button>
        <Link
          href="/admin/forgot-password"
          className="text-center text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Request a new link
        </Link>
      </form>
    </div>
  );
}

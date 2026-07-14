'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { requestPasswordReset } from '@/lib/auth/clientPasswordReset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      setPending(false);
      return;
    }

    const result = await requestPasswordReset(trimmed);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Check your email</p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            If an account exists for <span className="font-medium text-foreground">{email}</span>,
            we sent a password reset link. It may take a minute to arrive.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          prefix={<Mail className="h-3.5 w-3.5" />}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Sending link…' : 'Send reset link'}
        </Button>
      </form>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <NavLink href="/login" prefetch className={cn(NAV_BACK_LINK, 'mb-4')}>
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </NavLink>

        <div className="mb-8 flex flex-col items-center gap-3">
          <BuilBidLogo size="xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/80 p-8 shadow-xl shadow-black/[0.06] backdrop-blur-md dark:bg-card/60">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-emerald-500" />
              </div>
            }
          >
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { updatePassword } from '@/lib/auth/clientPasswordReset';
import { createClient } from '@/lib/supabase/client';
import { getDashboardPath } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(Boolean(session));
      if (!session) {
        setError('This reset link is invalid or has expired. Request a new one.');
      }
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    const result = await updatePassword(password);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setDone(true);
    setPending(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const metaRole = user?.user_metadata?.role as string | undefined;
    let redirectPath = getDashboardPath(metaRole);

    if (user && !metaRole) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      redirectPath = getDashboardPath(profile?.role);
    }

    setTimeout(() => {
      router.replace(redirectPath);
      router.refresh();
    }, 1200);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-foreground">Password updated</p>
        <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
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

      {!ready ? (
        <div className="flex items-center justify-center py-8">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-emerald-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="New password"
            name="password"
            type={showPw ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            prefix={<Lock className="h-3.5 w-3.5" />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="text-muted-foreground transition-colors hover:text-foreground/80"
              >
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            }
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />

          <Input
            label="Confirm password"
            name="confirm_password"
            type={showPw ? 'text' : 'password'}
            placeholder="Repeat your password"
            prefix={<Lock className="h-3.5 w-3.5" />}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={pending}
          />

          <Button type="submit" size="lg" className="w-full" disabled={pending || !ready}>
            {pending ? 'Updating…' : 'Update password'}
          </Button>

          {!ready && error && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          )}
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BuilBidLogo size="xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Set a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a strong password for your BuilBid account.
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
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

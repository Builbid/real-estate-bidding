'use client'

import { Suspense, useActionState, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { BuilBidLogo } from '@/components/shared/BuilBidLogo'
import { signInAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NavLink } from '@/components/shared/NavLink'
import { NAV_BACK_LINK } from '@/lib/navStyles'
import { cn } from '@/lib/utils'

type RoleParam = 'owner' | 'bidder' | null

function parseRoleParam(value: string | null): RoleParam {
  if (value === 'owner' || value === 'bidder') return value
  return null
}

function LoginForm({ roleParam }: { roleParam: RoleParam }) {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? (roleParam === 'owner' ? '/dashboard/owner' : '')

  const [state, formAction, pending] = useActionState(signInAction, { error: null })
  const [showPw, setShowPw] = useState(false)

  return (
    <>
      {state.error && (
        <div className="flex items-start gap-3 mb-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          prefix={<Mail className="w-3.5 h-3.5" />}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          name="password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          prefix={<Lock className="w-3.5 h-3.5" />}
          suffix={
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          }
          required
          autoComplete="current-password"
        />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign In <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>
    </>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const roleParam = parseRoleParam(searchParams.get('role'))

  const title =
    roleParam === 'owner'
      ? 'Client Login'
      : roleParam === 'bidder'
        ? 'Contractor / Firm Login'
        : 'Welcome back'

  const subtitle =
    roleParam === 'owner'
      ? 'Sign in to post and manage your construction projects'
      : roleParam === 'bidder'
        ? 'Sign in to browse auctions and place bids'
        : 'Sign in to your BuilBid account'

  const registerHref = roleParam ? `/register?role=${roleParam}` : '/register'

  return (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {roleParam && (
          <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-4')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </NavLink>
        )}

        <div className="flex flex-col items-center gap-3 mb-8">
          <BuilBidLogo size="xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/80 dark:bg-card/60 backdrop-blur-md shadow-xl shadow-black/[0.06] p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <span className="w-5 h-5 rounded-full border-2 border-border border-t-emerald-500 animate-spin" />
              </div>
            }
          >
            <LoginForm roleParam={roleParam} />
          </Suspense>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={registerHref} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground/80">
          By signing in, you agree to our{' '}
          <span className="text-muted-foreground">Terms of Service</span> and{' '}
          <span className="text-muted-foreground">Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-4">
          <span className="w-6 h-6 rounded-full border-2 border-border border-t-emerald-500 animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

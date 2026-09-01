'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { BuilBidLogo } from '@/components/shared/BuilBidLogo'
import { clientSignIn } from '@/lib/auth/clientSignIn'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthDivider } from '@/components/auth/AuthDivider'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? (roleParam === 'owner' ? '/dashboard/owner' : '')

  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    router.prefetch('/dashboard/owner')
    router.prefetch('/dashboard/builder')
    router.prefetch('/dashboard/firm')
    router.prefetch('/dashboard/admin')
    router.prefetch('/dashboard/provider')
  }, [router])

  useEffect(() => {
    if (searchParams.get('error') === 'confirmation_failed') {
      setError('Sign in failed. Please try again or use another method.')
    }
  }, [searchParams])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = (form.get('email') as string | null)?.trim() ?? ''
    const password = (form.get('password') as string | null) ?? ''

    if (!email || !password) {
      setError('Email and password are required.')
      setPending(false)
      return
    }

    const result = await clientSignIn(email, password)
    if (result.error) {
      setError(result.error)
      setPending(false)
      return
    }

    const destination =
      nextPath && nextPath.startsWith('/') ? nextPath : result.redirectPath

    router.replace(destination)
    router.refresh()
  }

  return (
    <>
      {error && (
        <div className="flex items-start gap-3 mb-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <GoogleSignInButton
        nextPath={nextPath && nextPath.startsWith('/') ? nextPath : undefined}
        roleHint={roleParam === 'owner' ? 'owner' : roleParam === 'bidder' ? 'labour_contractor' : null}
        disabled={pending}
      />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          prefix={<Mail className="w-3.5 h-3.5" />}
          required
          autoComplete="email"
          disabled={pending}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </span>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            name="password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            prefix={<Lock className="w-3.5 h-3.5" />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
            required
            autoComplete="current-password"
            disabled={pending}
          />
        </div>

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

          <div className="mt-6 pt-6 border-t border-border text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={registerHref} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Create one free
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Trade professional (painter, electrician, etc.)?{' '}
              <Link href="/signup/provider" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                Register to bid
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
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

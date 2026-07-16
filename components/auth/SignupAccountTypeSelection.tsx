import Link from 'next/link';
import { ArrowLeft, Briefcase, Home } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPE_OPTIONS = [
  {
    id: 'client',
    href: '/signup/client',
    emoji: '🏠',
    title: 'Client',
    subtitle: 'Post projects and receive competitive construction bids',
    accent: 'teal' as const,
  },
  {
    id: 'service_provider',
    href: '/signup/provider',
    emoji: '🔧',
    title: 'Service Provider',
    subtitle: 'Offer labour, turnkey construction, or local trade services',
    accent: 'emerald' as const,
  },
] as const;

export function SignupAccountTypeSelection() {
  return (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex flex-col items-center gap-3 mb-8">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <BuilBidLogo size="xl" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how you&apos;ll use BuilBid
            </p>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>

        <div className="rounded-2xl border border-border/80 bg-card/80 dark:bg-card/60 backdrop-blur-md shadow-xl shadow-black/[0.06] p-6 sm:p-8 space-y-3">
          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
            <Link
              key={opt.id}
              href={opt.href}
              className={cn(
                'flex items-start gap-4 w-full text-left px-4 py-5 rounded-xl border-2 transition-all duration-200',
                'hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md',
                'border-border bg-secondary/30 hover:border-muted-foreground/30',
                opt.accent === 'teal' && 'hover:border-teal-500/40',
                opt.accent === 'emerald' && 'hover:border-emerald-500/40',
              )}
            >
              <span className="text-3xl leading-none shrink-0">{opt.emoji}</span>
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground flex items-center gap-2">
                  {opt.title}
                  {opt.id === 'client' ? (
                    <Home className="h-4 w-4 text-teal-600 opacity-80" aria-hidden />
                  ) : (
                    <Briefcase className="h-4 w-4 text-emerald-600 opacity-80" aria-hidden />
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">{opt.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

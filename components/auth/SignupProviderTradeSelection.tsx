import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { getProviderSignupCategories } from '@/lib/trades';
import { cn } from '@/lib/utils';

export function SignupProviderTradeSelection() {
  return (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        <Link
          href="/signup"
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
              Which service do you provide?
            </p>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6">
          Already have an account?{' '}
          <Link href="/login?role=bidder" className="text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>

        <div className="rounded-2xl border border-border/80 bg-card/80 dark:bg-card/60 backdrop-blur-md shadow-xl shadow-black/[0.06] p-6 sm:p-8 space-y-3">
          <p className="text-sm font-semibold text-foreground/80 mb-1">
            Bid your rate/sqft on live client projects
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr items-stretch">
            {getProviderSignupCategories().map((service) => (
              <Link
                key={service.value}
                href={`/register?role=${service.value}`}
                prefetch
                className={cn(
                  'flex h-full flex-col items-center text-center gap-1.5 px-3 py-4 rounded-xl border-2 transition-all duration-200',
                  'hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md',
                  'border-border bg-secondary/30 hover:border-emerald-500/40',
                )}
              >
                <span className="text-2xl leading-none">{service.emoji}</span>
                <span className="text-sm font-bold text-foreground">{service.label}</span>
                <span className="flex-1 text-[11px] leading-snug text-muted-foreground">
                  {service.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

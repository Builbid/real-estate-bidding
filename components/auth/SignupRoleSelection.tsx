import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';
import { SIGNUP_ROLE_CARDS } from '@/lib/auth/signupRoleCards';
import { cn } from '@/lib/utils';

export function SignupRoleSelection() {
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
          <Link
            href="/"
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
          >
            <Building2 className="w-7 h-7 text-emerald-400" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Join BuilBid — the professional construction bidding platform
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-1.5 w-8 rounded-full bg-emerald-500" />
          <div className="h-1.5 w-4 rounded-full bg-muted" />
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>

        <div className="rounded-2xl border border-border/80 bg-card/80 dark:bg-card/60 backdrop-blur-md shadow-xl shadow-black/[0.06] p-8">
          <p className="text-sm font-semibold text-foreground/80 mb-4">How will you use BuilBid?</p>
          <div className="space-y-3">
            {SIGNUP_ROLE_CARDS.map((card) => {
              const isFirm = card.role === 'construction_firm';
              return (
                <Link
                  key={card.role}
                  href={card.href}
                  className={cn(
                    'block w-full text-left px-4 py-4 rounded-xl border-2 transition-all duration-200',
                    'hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md',
                    'border-border bg-secondary/30 hover:border-muted-foreground/30 hover:bg-secondary/50',
                    isFirm && 'border-violet-500/20 bg-violet-500/[0.03] hover:border-violet-500/40 hover:bg-violet-500/[0.06]',
                    card.accent === 'teal' && 'hover:border-teal-500/40 hover:shadow-md hover:shadow-teal-500/10',
                    card.accent === 'emerald' && 'hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/10',
                    card.accent === 'violet' && 'hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/15',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 leading-none">{card.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground mb-0.5">{card.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug mb-2">{card.subtitle}</p>
                      <ul className="space-y-0.5 mb-2">
                        {card.bullets.map((bullet) => (
                          <li key={bullet} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                      {card.noteBadge && (
                        <span
                          className={cn(
                            'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            isFirm
                              ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                              : 'bg-secondary text-muted-foreground border border-border',
                          )}
                        >
                          {card.noteBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Footer } from '@/components/shared/Footer';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { NAV_LOGO_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/provider/dashboard');

  const { data: provider } = await supabase
    .from('service_providers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className={cn(NAV_LOGO_LINK, 'hover:opacity-90')}>
          <BuilBidLogo size="sm" />
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          <Link href="/hire-services" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline">
            Hire Services
          </Link>
          <Link href="/provider/dashboard" className="font-medium text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/provider/verify" className="font-medium text-muted-foreground hover:text-foreground">
            Verification
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        {!provider && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Complete your{' '}
            <Link href="/signup/provider" className="font-semibold underline">
              provider profile
            </Link>{' '}
            to appear in Hire Services listings.
          </div>
        )}
        {children}
      </main>
      <Footer compact />
    </div>
  );
}

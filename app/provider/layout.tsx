import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Footer } from '@/components/shared/Footer';
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className={cn(NAV_LOGO_LINK, 'hover:opacity-90')}>
          <BuilBidLogo size="sm" />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/provider/dashboard" className="text-muted-foreground hover:text-foreground font-medium">
            Dashboard
          </Link>
          <Link href="/provider/verify" className="text-muted-foreground hover:text-foreground font-medium">
            Verification
          </Link>
        </nav>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        {!provider && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
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

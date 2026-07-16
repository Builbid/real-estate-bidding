import Link from 'next/link';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { NAV_LOGO_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

/** Minimal header for signup — avoids full Navbar + profile fetch. */
export function AuthSimpleHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className={cn(NAV_LOGO_LINK, 'hover:opacity-90')} prefetch>
          <BuilBidLogo size="sm" />
        </Link>
        <Link
          href="/login"
          prefetch
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

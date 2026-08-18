import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { NavLink } from '@/components/shared/NavLink';
import { cn } from '@/lib/utils';
import { NAV_BACK_LINK } from '@/lib/navStyles';

interface StaticPageShellProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function StaticPageShell({
  title,
  subtitle,
  lastUpdated,
  children,
  className,
  headerClassName,
}: StaticPageShellProps) {
  return (
    <>
      <Navbar />
      <main className={cn('max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16', className)}>
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-8')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>

        <header
          className={cn(
            'mb-10 rounded-2xl border border-border/70 bg-card/50 p-6 sm:p-8 shadow-sm backdrop-blur-sm',
            headerClassName,
          )}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
          {lastUpdated && (
            <p className="mt-4 text-xs text-muted-foreground/80">Last updated: {lastUpdated}</p>
          )}
        </header>

        <article className="space-y-8 text-sm sm:text-[15px] leading-relaxed text-foreground/90">
          {children}
        </article>
      </main>
    </>
  );
}

export function StaticSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

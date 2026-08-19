import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { NavLink } from '@/components/shared/NavLink';
import { cn } from '@/lib/utils';
import { NAV_BACK_LINK } from '@/lib/navStyles';

interface StaticPageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundImage?: string;
  lastUpdated?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function StaticPageShell({
  title,
  subtitle,
  eyebrow,
  backgroundImage,
  lastUpdated,
  children,
  className,
  headerClassName,
}: StaticPageShellProps) {
  const content = (
    <>
      <Navbar />
      <main className={cn('relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16', className)}>
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-8')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>

        {eyebrow && (
          <p className="mb-4 text-xl font-semibold uppercase tracking-wider text-emerald-400">
            {eyebrow}
          </p>
        )}

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

  if (!backgroundImage) {
    return content;
  }

  return (
    <div
      data-page-background
      className="relative min-h-screen bg-transparent bg-fixed bg-cover bg-center text-slate-100 dark"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <div className="relative z-10">{content}</div>
    </div>
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

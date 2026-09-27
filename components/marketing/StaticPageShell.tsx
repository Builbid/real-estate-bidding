import { Navbar } from '@/components/shared/Navbar';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { cn } from '@/lib/utils';

/** Shared footer-page column: privacy, terms, about, careers, contact, materials. */
export const PLATFORM_PAGE_MAIN =
  'relative z-10 mx-auto max-w-6xl px-6 py-10 sm:px-10';

export const PLATFORM_H1 =
  'text-2xl font-semibold tracking-tight text-foreground sm:text-3xl';

export const PLATFORM_H2 =
  'text-lg font-semibold tracking-tight text-foreground';

export const PLATFORM_H3 =
  'text-base font-medium tracking-tight text-foreground';

export const PLATFORM_COPY =
  'text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8';

interface StaticPageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundImage?: string;
  lastUpdated?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  eyebrowClassName?: string;
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
  titleClassName,
  eyebrowClassName,
}: StaticPageShellProps) {
  const content = (
    <>
      <Navbar />
      <main className={cn(PLATFORM_PAGE_MAIN, className)}>
        <HistoryBackButton className="mb-6" />

        {eyebrow && (
          <p
            className={cn(
              'mb-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400',
              eyebrowClassName,
            )}
          >
            {eyebrow}
          </p>
        )}

        <header className={cn('mb-8', headerClassName)}>
          <h1 className={cn(PLATFORM_H1, titleClassName)}>{title}</h1>
          {subtitle && <p className={cn('mt-3', PLATFORM_COPY)}>{subtitle}</p>}
          {lastUpdated && (
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          )}
        </header>

        <article>{children}</article>
      </main>
    </>
  );

  if (!backgroundImage) {
    return content;
  }

  return (
    <div
      data-page-background
      className="relative min-h-screen bg-slate-50 bg-fixed bg-cover bg-center text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-slate-50/95 backdrop-blur-sm dark:bg-slate-950/80"
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
    <section className="border-t border-border/40 pt-8">
      <h2 className={PLATFORM_H2}>{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

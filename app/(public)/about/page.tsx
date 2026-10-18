import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, FileCheck, ShieldCheck, Wallet } from 'lucide-react';
import { PLATFORM_COPY, PLATFORM_H2, StaticPageShell } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'BuilBid delivers end-to-end transparency, verified on-site supervision, IS-compliant material estimation, and legally binding agreements for civil construction across Assam and Northeast India.',
};

const SERVICES = [
  {
    icon: BadgeCheck,
    title: 'Verified On-Site Supervision & Field Inspection',
    body: 'Dedicated field supervisors oversee site measurements, progress tracking, and site records from start to finish.',
  },
  {
    icon: FileCheck,
    title: 'Binding Legal Agreements & Dispute Protection',
    body: 'Standardized, legally binding contract agreements for homeowners and workers, written for transparent and dispute-free execution.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality Control & Material Estimation',
    body: 'Structural quality assurance with material requirement lists and hardware estimation prepared to the specification each project requires.',
  },
  {
    icon: Wallet,
    title: '100% Secure Digital Payments & Milestone Tracking',
    body: 'Transparent direct digital payments between Homeowners and BuilBid, released worker payouts milestone-by-milestone with digitized invoice records.',
  },
] as const;

export default function AboutPage() {
  return (
    <StaticPageShell
      className="max-w-4xl px-4 sm:px-6"
      eyebrow="About Us"
      title="Civil construction, held to a clear standard"
      subtitle="BuilBid serves homeowners and workers across Assam and Northeast India with verified site supervision, clear agreements, and milestone payments."
    >
      <div className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
            <h2 className={PLATFORM_H2}>Our Mission</h2>
            <p className={`mt-2 text-sm sm:text-[15px] ${PLATFORM_COPY}`}>
              Delivering end-to-end transparency, verified on-site field supervision, accurate
              IS-compliant material estimation, and legally binding dispute-free agreements for
              civil construction across Assam and Northeast India.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
            <h2 className={PLATFORM_H2}>Our Vision</h2>
            <p className={`mt-2 text-sm sm:text-[15px] ${PLATFORM_COPY}`}>
              A civil construction market in Assam and Northeast India where every homeowner can
              follow the work with confidence, and every worker is held to the same clear standard
              from the first estimate to the finished home.
            </p>
          </article>
        </div>

        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
          <h2 className={PLATFORM_H2}>Modern construction and safety</h2>
          <p className={`mt-2 text-sm sm:text-[15px] ${PLATFORM_COPY}`}>
            Modern civil engineering practice, disaster-resistant building standards that stand up
            to earthquakes, and structural quality assurance come together to safeguard every
            homeowner&apos;s dream home.
          </p>
        </section>

        <section>
          <h2 className={PLATFORM_H2}>What we do</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SERVICES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold leading-snug text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border/40 pt-6">
          <h2 className={PLATFORM_H2}>Start a project</h2>
          <p className={`mt-2 text-sm sm:text-[15px] ${PLATFORM_COPY}`}>
            Post a civil project, compare worker prices, and keep verified on-site supervision on
            record from the first visit through later progress.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/signup">Create Account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/#live-auctions">Explore live auctions</Link>
            </Button>
          </div>
        </section>
      </div>
    </StaticPageShell>
  );
}

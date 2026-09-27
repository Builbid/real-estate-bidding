import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'BuilBid terms for benchmark estimates, the 24-hour bid selection window, site visits, Aadhaar e-Sign, and material supply.',
};

const COPY = 'max-w-prose text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8';

function OpenSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/40 pt-8">
      <h2 className="text-base font-medium tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <StaticPageShell
      className="max-w-3xl"
      headerClassName="mb-8 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
      titleClassName="text-2xl font-medium sm:text-3xl"
      title="Terms of Service"
      subtitle="These terms describe how estimates, bidding, site visits, and digital agreements work on BuilBid."
      lastUpdated="27 September 2026"
    >
      <OpenSection title="Benchmark Estimation & Bidding Process">
        <p className={COPY}>
          Initial project specifications and rates are virtual benchmark estimates. They exist
          so property owners can compare offers fairly. They are not a final fixed quote.
        </p>
        <p className={COPY}>
          After verified contractors and skilled workers (Mistris) submit competitive bids, the
          property owner has a 24-hour decision window to select a preferred bid.
        </p>
      </OpenSection>

      <OpenSection title="Site Visit & Digital Execution Agreement">
        <p className={COPY}>
          Once a bid is selected, BuilBid coordinates a physical site visit with a Field
          Supervisor and the chosen contractor. That visit confirms the exact site measurements
          before work begins.
        </p>
        <p className={COPY}>
          Before project kickoff, both parties sign a legally binding digital contract through
          Aadhaar e-Sign. The agreement locks in the completion timeframe, quality guarantees,
          and work milestones.
        </p>
      </OpenSection>

      <OpenSection title="Quality Control & Contractor Obligations">
        <p className={COPY}>
          Contractors and Mistris agree to follow BuilBid’s Digital Quality Control Checklist
          through the full execution of the project.
        </p>
        <p className={COPY}>
          Payment schedules, billing records, and milestone payments stay on record inside the
          platform so both sides can see the same billing history.
        </p>
      </OpenSection>

      <OpenSection title="Property Owner Responsibilities">
        <p className={COPY}>
          Property owners supply the hardware, raw materials, and fittings the work requires,
          and they deliver those items in time for the agreed schedule.
        </p>
        <p className={COPY}>
          If materials arrive late, the contractor is relieved of delay penalties for that
          waiting time, and the project timeline is adjusted to match the delay.
        </p>
        <p className={COPY}>
          Questions about these terms can be sent to{' '}
          <a
            href="mailto:support@builbid.in"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            support@builbid.in
          </a>{' '}
          or through{' '}
          <Link
            href="/contact"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Contact Us
          </Link>
          . See also the{' '}
          <Link
            href="/privacy"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </OpenSection>
    </StaticPageShell>
  );
}

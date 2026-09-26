import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Rules for property owners and verified contractors using the BuilBid bidding platform.',
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
      subtitle="These terms set the rules for property owners and verified contractors using BuilBid."
      lastUpdated="26 September 2026"
    >
      <OpenSection title="Platform Usage">
        <p className={COPY}>
          BuilBid is a bidding platform. Digital estimates and bids are provided so property
          owners can compare offers and evaluate a project fairly. Contractors use the same
          records to submit clear, standardized rates.
        </p>
        <p className={COPY}>
          Estimates and rankings are tools for that evaluation. They do not replace the
          agreement you make for the work itself. By using BuilBid, you agree to these terms.
        </p>
      </OpenSection>

      <OpenSection title="Contractor & Owner Responsibilities">
        <p className={COPY}>
          Property owners must post accurate project requirements, including work specifications
          and site details. Verified contractors must submit rates they are prepared to stand
          by and follow the site verification standards shown for the project.
        </p>
        <p className={COPY}>
          Both sides are responsible for the information they enter. Site checks, measurements,
          and quality records should match what was posted and bid. BuilBid does not replace
          either party’s duty to review the work on site.
        </p>
      </OpenSection>

      <OpenSection title="Account Integrity & Liability">
        <p className={COPY}>
          Keep your login details private and tell us if you suspect unauthorized access. You
          are responsible for activity under your account. Do not share an account or use it
          to interfere with another user’s bids or records.
        </p>
        <p className={COPY}>
          Disputes about workmanship, payment, or a project record should be raised through{' '}
          <Link
            href="/contact"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Contact Us
          </Link>
          , with the project title and a short description of the issue. BuilBid provides the
          platform and its records. It is not the contractor for the construction work, and
          liability for the job stays with the people who agreed to perform and pay for it.
        </p>
        <p className={COPY}>
          Questions about these terms can be sent to{' '}
          <a
            href="mailto:support@builbid.in"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            support@builbid.in
          </a>
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

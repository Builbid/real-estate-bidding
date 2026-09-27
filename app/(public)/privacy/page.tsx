import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How BuilBid collects account, site, and estimate information, and how that data is protected for construction bidding.',
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

export default function PrivacyPage() {
  return (
    <StaticPageShell
      className="max-w-3xl"
      headerClassName="mb-8 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
      titleClassName="text-2xl font-medium sm:text-3xl"
      title="Privacy Policy"
      subtitle="This policy explains the information BuilBid uses to run construction estimates, bidding, and site coordination."
      lastUpdated="27 September 2026"
    >
      <OpenSection title="Information Collected">
        <p className={COPY}>
          BuilBid collects account identifiers, site locations, measurement checklists, and
          estimate inputs. These are the details required to post a project, compare bids, and
          keep a construction record.
        </p>
        <p className={COPY}>
          Account identifiers include your name and contact details. Site locations and
          measurement checklists describe where the work is and what was measured. Estimate
          inputs are the specifications used to prepare a digital estimate.
        </p>
      </OpenSection>

      <OpenSection title="Use of Information">
        <p className={COPY}>
          This information is used for project coordination, digital estimate generation, field
          supervisor scheduling, and transaction verification. Property owners, contractors, and
          site supervisors see the records needed for the project they are on.
        </p>
        <p className={COPY}>
          The same records support a clear bid comparison and a documented path from estimate to
          site visit and agreement.
        </p>
      </OpenSection>

      <OpenSection title="Data Ownership & Security">
        <p className={COPY}>
          Project and account records are protected with enterprise-grade encryption and strict
          access controls. BuilBid maintains a zero data selling or monetization standard:
          personal and project information is used to operate the platform.
        </p>
        <p className={COPY}>
          Records are retained for as long as the account or project needs them, including
          dispute handling and legal record-keeping. You can ask to review or delete account
          data by writing to{' '}
          <a
            href="mailto:support@builbid.in"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            support@builbid.in
          </a>
          .
        </p>
      </OpenSection>

      <OpenSection title="Operational Cookies">
        <p className={COPY}>
          BuilBid uses minimal session cookies so you can stay signed in and move through the
          site. These cookies support convenience and navigation. They are not used as an
          advertising profile.
        </p>
        <p className={COPY}>
          Questions about this policy can be sent through{' '}
          <Link
            href="/contact"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Contact Us
          </Link>
          . Platform rules are in the{' '}
          <Link
            href="/terms"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Terms of Service
          </Link>
          .
        </p>
      </OpenSection>
    </StaticPageShell>
  );
}

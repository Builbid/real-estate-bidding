import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORM_COPY, StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'BuilBid terms for benchmark estimates, the 24-hour bidding and selection windows, cashless digital payments, field visits, e-Sign agreements, quality checklists, and material supply.',
};

export default function TermsPage() {
  return (
    <StaticPageShell
      className="max-w-4xl mx-auto px-4 sm:px-6"
      title="Terms of Service"
      subtitle="These terms apply to project estimates, contractor bidding selection, site verification protocols, and execution standards on BuilBid."
      lastUpdated="19 October 2026"
    >
      <StaticSection title="Estimation & Bidding & Selection Window">
        <p className={PLATFORM_COPY}>
          Initial project requirements serve as virtual benchmark estimates. They give property
          owners a fair basis for comparison. They are not a final fixed quote. Bidding runs for
          an active duration of 24 hours. Property owners can start selecting their preferred
          contractor or skilled worker from the moment bidding begins. Once that active 24-hour
          bidding period ends, the owner receives an extended 24-hour decision window specifically
          for final selection. If the property owner does not select a bid within this final
          extended window, the bidding instance automatically expires and is removed and cancelled
          from the active platform feed. Rates submitted during the active bidding window remain
          fixed for the defined requirements and will NOT change during or after the physical
          site visit.
        </p>
      </StaticSection>

      <StaticSection title="100% Digital & Cashless Payment Standard">
        <p className={PLATFORM_COPY}>
          All financial transactions on BuilBid, including milestone-based payments over the
          duration of the project, must be processed 100% digitally through integrated online
          payment gateways or UPI. Cash payments are strictly prohibited on the platform.
          Workers and contractors are notified that all earnings and milestone payouts are
          disbursed exclusively via digital online transfers to their registered bank accounts.
        </p>
      </StaticSection>

      <StaticSection title="Field Visit & e-Sign Agreement">
        <p className={PLATFORM_COPY}>
          After a bid is selected, a physical site visit by a Field Supervisor and the selected
          contractor is mandatory. The visit confirms measurements before work starts. Both
          parties then execute a binding digital agreement via e-Sign. The agreement specifies
          project completion timelines, quality protocols, and execution standards.
        </p>
      </StaticSection>

      <StaticSection title="Quality Control & Material Supply">
        <p className={PLATFORM_COPY}>
          Contractors strictly follow BuilBid’s Digital Quality Control Checklist for the duration
          of the work. Checklist records stay with the project. Property owners deliver hardware
          and construction materials in a timely manner so the agreed project schedule can be
          maintained. Late material delivery is reflected in the project timeline. Questions about
          these terms can be sent to{' '}
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
      </StaticSection>
    </StaticPageShell>
  );
}

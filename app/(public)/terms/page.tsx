import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'BuilBid terms for benchmark estimates, the 24-hour bid window, field visits, e-Sign agreements, quality checklists, and material supply.',
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
      subtitle="These terms govern estimates, contractor selection, site verification, and project execution on BuilBid."
      lastUpdated="27 September 2026"
    >
      <OpenSection title="Estimation & 24-Hour Bidding">
        <p className={COPY}>
          Initial project requirements serve as virtual benchmark estimates. They give property
          owners a fair basis for comparison. They are not a final fixed quote.
        </p>
        <p className={COPY}>
          When verified contractors and skilled workers (Mistris) submit bids, the property
          owner has a 24-hour decision window to select the preferred contractor or Mistri.
        </p>
      </OpenSection>

      <OpenSection title="Field Visit & e-Sign Agreement">
        <p className={COPY}>
          After a bid is selected, a physical site visit by a Field Supervisor and the selected
          contractor is mandatory. The visit confirms measurements before work starts.
        </p>
        <p className={COPY}>
          Both parties then execute a binding digital agreement via e-Sign. The agreement covers
          timelines, guarantees, and quality standards for the project.
        </p>
      </OpenSection>

      <OpenSection title="Quality Control & Material Supply">
        <p className={COPY}>
          Contractors strictly follow BuilBid’s Digital Quality Control Checklist for the
          duration of the work. Checklist records stay with the project.
        </p>
        <p className={COPY}>
          Property owners deliver hardware and construction materials in a timely manner so the
          agreed project schedule can be maintained. Late material delivery is reflected in the
          project timeline.
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

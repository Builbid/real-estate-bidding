import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'BuilBid keeps names, contact details, project records, and bids encrypted and confidential, and uses them only to run estimates and verified bidding.',
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
      subtitle="Your name, contact details, and project records stay confidential on BuilBid and are used to serve your account."
      lastUpdated="26 September 2026"
    >
      <OpenSection title="Our Privacy Commitment">
        <p className={COPY}>
          BuilBid respects your autonomy. Names, contact information, project details, and bid
          records are encrypted, kept strictly confidential, and used solely to service BuilBid
          operations.
        </p>
        <p className={COPY}>
          Robust access controls mean those records stay with the people and systems that run
          your estimates, bids, and project files. BuilBid never shares your information with
          unauthorized third parties.
        </p>
      </OpenSection>

      <OpenSection title="Purpose-Bound Collection">
        <p className={COPY}>
          Data collection is limited to what facilitates transparent digital estimations and
          verified contractor bidding. That includes the contact details on your account, the
          project specifications you post, and the site measurements used to prepare an estimate.
        </p>
        <p className={COPY}>
          Those details let property owners, contractors, and site supervisors compare clear
          rates and keep an accurate project record. Collection stays tied to that work.
        </p>
      </OpenSection>

      <OpenSection title="Data Ownership & Security">
        <p className={COPY}>
          You remain in charge of your account. You can view and update your details at any
          time, and you can request deletion of your account data whenever you choose.
        </p>
        <p className={COPY}>
          Send that request from your registered email to{' '}
          <a
            href="mailto:support@builbid.in"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            support@builbid.in
          </a>
          , or write through{' '}
          <Link
            href="/contact"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Contact Us
          </Link>
          . We will confirm when it is complete. Platform use is described in the{' '}
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

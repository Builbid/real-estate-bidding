import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How BuilBid collects and protects information for property owners, contractors, and site supervisors.',
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
      subtitle="This policy explains how BuilBid handles information for property owners, contractors, and site supervisors."
      lastUpdated="26 September 2026"
    >
      <OpenSection title="Information We Collect">
        <p className={COPY}>
          When you create an account, we collect your name and contact details, including email
          and phone number. Property owners also provide project specifications. Contractors and
          site supervisors provide the details needed to take part in bidding and site work.
        </p>
        <p className={COPY}>
          As a project moves forward, we store site measurement data and the records tied to
          estimates, bids, and supervision. We keep only what is needed to run the account and
          the project.
        </p>
      </OpenSection>

      <OpenSection title="How We Use Data">
        <p className={COPY}>
          We use this information to run transparent bidding, send digital estimates, and keep
          project records that owners, contractors, and site supervisors can refer to. That
          includes matching a posted project with verified participants and showing comparable
          rates.
        </p>
        <p className={COPY}>
          We also use account data to sign you in, send notices about your projects, and keep
          the platform secure. We do not use your information for unrelated marketing lists.
        </p>
      </OpenSection>

      <OpenSection title="Data Protection & Rights">
        <p className={COPY}>
          BuilBid does not sell personal information to third parties. Access to project and
          account data is limited to operating the platform, and connections are protected in
          transit. You can ask us to correct your details or close your account.
        </p>
        <p className={COPY}>
          Privacy requests can be sent to{' '}
          <a
            href="mailto:support@builbid.in"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            support@builbid.in
          </a>
          . You can also use the{' '}
          <Link
            href="/contact"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Contact Us
          </Link>{' '}
          page. Our{' '}
          <Link
            href="/terms"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Terms of Service
          </Link>{' '}
          explain how the platform is used.
        </p>
      </OpenSection>
    </StaticPageShell>
  );
}

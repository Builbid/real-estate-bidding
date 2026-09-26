import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'BuilBid does not sell your data. We collect only what is needed for estimates, bidding, and project records.',
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
      subtitle="Your project details stay on BuilBid. We use them to prepare estimates and run verified bidding, and for nothing else."
      lastUpdated="26 September 2026"
    >
      <OpenSection title="What we do not do">
        <p className={COPY}>
          BuilBid never sells, rents, or monetizes your data to marketers or advertisers. Your
          name, phone number, project files, and bid records are not a product we offer to
          anyone else.
        </p>
        <p className={COPY}>
          We do not collect background personal data you did not choose to give us, and we do
          not track you on other websites after you leave BuilBid. If it is not needed to run
          your account or your project, we do not ask for it.
        </p>
      </OpenSection>

      <OpenSection title="What we collect">
        <p className={COPY}>
          We collect only what a property owner, contractor, or site supervisor needs to use
          the platform. That is your name and contact details, the project specifications you
          post, and the site measurement data used to generate an estimate.
        </p>
        <p className={COPY}>
          Those details let us send a digital estimate, match the project with verified
          bidders, and keep a clear project record. We do not build a separate profile of your
          life outside that work.
        </p>
      </OpenSection>

      <OpenSection title="How your data is protected">
        <p className={COPY}>
          Every bid and project document is stored under access controls, with encryption in
          transit and secure database controls on the systems that hold your records. Only the
          people and services required to operate BuilBid can reach that information.
        </p>
        <p className={COPY}>
          We use modern security standards so a posted rate, a measurement, or a contact
          detail is not left open on the public internet. Protection of the project record is
          part of how the platform works, not an optional extra.
        </p>
      </OpenSection>

      <OpenSection title="Your choices">
        <p className={COPY}>
          You can view and update the details on your account at any time. If you want your
          account data deleted, email{' '}
          <a
            href="mailto:support@builbid.in"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            support@builbid.in
          </a>{' '}
          from your registered address, or write through{' '}
          <Link
            href="/contact"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Contact Us
          </Link>
          . We will confirm once the request is done.
        </p>
        <p className={COPY}>
          Questions about this policy are welcome at the same address. How the platform is used
          is set out in the{' '}
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

import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'BuilBid empowers property owners and contractors with a modern platform to streamline construction bidding, digital estimations, and real-time site supervision.',
};

const PARAGRAPH =
  'max-w-prose text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8';

function OpenSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/40 pt-8">
      <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <StaticPageShell
      className="max-w-3xl"
      headerClassName="mb-8 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
      eyebrowClassName="mb-2 text-xs font-medium tracking-[0.16em]"
      titleClassName="text-2xl font-medium sm:text-3xl"
      eyebrow="About Us"
      title="Empowering Modern Construction Bidding"
      subtitle="BuilBid empowers property owners and contractors with a modern platform to streamline construction bidding, digital estimations, and real-time site supervision."
    >
      <OpenSection title="Our Mission">
        <p className={PARAGRAPH}>
          Our mission is to bring absolute clarity and transparency to everyday construction
          projects. We enable project owners to evaluate comparable estimates while giving
          contractors a structured platform to submit clear, standardized rates.
        </p>
      </OpenSection>

      <OpenSection title="Core Values">
        <p className={PARAGRAPH}>
          Pricing and project records stay open, so owners and contractors can compare digital
          estimates on the same terms. Site supervision remains consistent from the first
          measurement through later progress.
        </p>
      </OpenSection>

      <OpenSection title="What We Do">
        <p className={PARAGRAPH}>
          BuilBid connects project requirements with verified site supervision. From accurate
          measurements to ongoing progress tracking, we ensure every project stays organized,
          recorded, and on schedule.
        </p>
      </OpenSection>

      <section className="border-t border-border/40 pt-8">
        <h2 className="text-base font-medium tracking-tight text-foreground">
          Start a project
        </h2>
        <p className={`mt-4 ${PARAGRAPH}`}>
          Post work, compare contractor estimates, and keep site supervision on record.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/#live-auctions">Explore live auctions</Link>
          </Button>
        </div>
      </section>
    </StaticPageShell>
  );
}

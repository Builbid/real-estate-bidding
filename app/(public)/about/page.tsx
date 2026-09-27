import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORM_COPY, StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'BuilBid empowers property owners and contractors with a modern platform to streamline construction bidding, digital estimations, and real-time site supervision.',
};

const PARAGRAPH = PLATFORM_COPY;

export default function AboutPage() {
  return (
    <StaticPageShell
      eyebrow="About Us"
      title="Empowering Modern Construction Bidding"
      subtitle="BuilBid empowers property owners and contractors with a modern platform to streamline construction bidding, digital estimations, and real-time site supervision."
    >
      <StaticSection title="Our Mission">
        <p className={PARAGRAPH}>
          Our mission is to bring absolute clarity and transparency to everyday construction
          projects. We enable project owners to evaluate comparable estimates while giving
          contractors a structured platform to submit clear, standardized rates.
        </p>
      </StaticSection>

      <StaticSection title="Core Values">
        <p className={PARAGRAPH}>
          Pricing and project records stay open, so owners and contractors can compare digital
          estimates on the same terms. Site supervision remains consistent from the first
          measurement through later progress.
        </p>
      </StaticSection>

      <StaticSection title="What We Do">
        <p className={PARAGRAPH}>
          BuilBid connects project requirements with verified site supervision. From accurate
          measurements to ongoing progress tracking, we ensure every project stays organized,
          recorded, and on schedule.
        </p>
      </StaticSection>

      <StaticSection title="Start a project">
        <p className={PARAGRAPH}>
          Post work, compare contractor estimates, and keep site supervision on record.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/#live-auctions">Explore live auctions</Link>
          </Button>
        </div>
      </StaticSection>
    </StaticPageShell>
  );
}

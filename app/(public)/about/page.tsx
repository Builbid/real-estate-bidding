import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORM_COPY, StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'BuilBid empowers property owners and Workers with a modern platform to streamline construction bidding, digital estimations, and real-time site supervision.',
};

const PARAGRAPH = PLATFORM_COPY;

const SERVICES = [
  {
    title: 'Verified On-Site Supervision & Field Inspection',
    body: 'Dedicated field supervisors oversee actual site measurements, progress tracking, and site records from start to finish.',
  },
  {
    title: 'Binding Legal Agreements & Dispute Protection',
    body: 'Standardized, legally compliant contract agreements for both Homeowners and Workers to ensure absolute transparency and dispute-free execution.',
  },
  {
    title: 'Quality Control & Material Estimation',
    body: 'Professional assistance with structural quality assurance, material requirement lists, and hardware estimation.',
  },
  {
    title: '100% Digital Payment Protection & Milestone Tracking',
    body: 'Secure escrow-style online payment routing with digitized invoice tracking and receipt records.',
  },
] as const;

export default function AboutPage() {
  return (
    <StaticPageShell
      eyebrow="About Us"
      title="Empowering Modern Construction Bidding"
      subtitle="BuilBid empowers property owners and Workers with a modern platform to streamline construction bidding, digital estimations, and real-time site supervision."
    >
      <StaticSection title="Our Mission">
        <p className={PARAGRAPH}>
          Our mission is to bring absolute clarity and transparency to everyday construction
          projects. We enable project owners to evaluate comparable estimates while giving
          Workers a structured platform to submit clear, standardized rates.
        </p>
      </StaticSection>

      <StaticSection title="Core Values">
        <p className={PARAGRAPH}>
          Pricing and project records stay open, so owners and Workers can compare digital
          estimates on the same terms. Site supervision remains consistent from the first
          measurement through later progress.
        </p>
      </StaticSection>

      <StaticSection title="What We Do">
        <ul className={`mt-1 list-disc space-y-3 pl-5 ${PARAGRAPH}`}>
          {SERVICES.map((service) => (
            <li key={service.title}>
              <span className="font-medium text-foreground">{service.title}:</span> {service.body}
            </li>
          ))}
        </ul>
      </StaticSection>

      <StaticSection title="Start a project">
        <p className={PARAGRAPH}>
          Post work, compare worker prices, with verified on-record site supervision.
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

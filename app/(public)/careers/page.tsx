import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Join the BuilBid team and help transform construction procurement in India.',
};

const OPEN_ROLES = [
  {
    title: 'Full-Stack Engineer',
    location: 'Guwahati / Remote (India)',
    type: 'Full-time',
    summary:
      'Build and ship features across our Next.js platform, Supabase backend, and real-time bidding systems.',
  },
  {
    title: 'Business Development — Construction',
    location: 'Assam',
    type: 'Full-time / Contract',
    summary:
      'Onboard labour contractors and construction firms, explain the BuilBid auction model, and grow our verified builder network.',
  },
  {
    title: 'Customer Success Associate',
    location: 'Guwahati / Hybrid',
    type: 'Full-time',
    summary:
      'Support clients and bidders through their first auction, resolve account issues, and gather product feedback.',
  },
] as const;

export default function CareersPage() {
  return (
    <StaticPageShell
      title="Careers at BuilBid"
      subtitle="We are a small, focused team solving a large, real problem in construction. If that excites you, we want to hear from you."
    >
      <StaticSection title="Why join us">
        <p>
          Construction is one of the largest industries in India and one of the least digitized.
          BuilBid sits at the intersection of real estate, technology, and trust — and we are
          early enough that your work will directly shape the product, the market, and the
          company culture.
        </p>
        <p>
          We value people who are curious, honest, and comfortable operating in ambiguity.
          You do not need a fancy degree — you need to care about building something that
          owners and contractors actually use.
        </p>
      </StaticSection>

      <StaticSection title="What we offer">
        <ul className="list-disc pl-5 space-y-2">
          <li>Meaningful ownership over features and outcomes</li>
          <li>Competitive compensation for the stage we are at</li>
          <li>Flexible work arrangements where the role allows</li>
          <li>Direct access to founders and fast decision-making</li>
          <li>A mission that improves how real homes and buildings get built</li>
        </ul>
      </StaticSection>

      <StaticSection title="Open roles">
        <p className="mb-4">
          We are actively hiring for the roles below. Don&apos;t see a perfect fit? Send us
          your profile anyway — we are always interested in meeting exceptional people.
        </p>
        <div className="space-y-4">
          {OPEN_ROLES.map((role) => (
            <div
              key={role.title}
              className="rounded-xl border border-border bg-card/60 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-foreground">{role.title}</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                  {role.type}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{role.location}</p>
              <p>{role.summary}</p>
            </div>
          ))}
        </div>
      </StaticSection>

      <StaticSection title="How to apply">
        <p>
          Email your CV and a short note on why BuilBid interests you to{' '}
          <a
            href="mailto:careers@builbid.in?subject=Application%20-%20BuilBid"
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            careers@builbid.in
          </a>
          . Tell us which role you are applying for (or propose your own). We review every
          application and respond within five business days.
        </p>
        <p>
          Learn more about what we are building on our{' '}
          <Link href="/about" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            About page
          </Link>.
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}

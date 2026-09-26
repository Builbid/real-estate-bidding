import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'BuilBid supports transparent contractor estimates and quality site supervision.',
};

const MISSION = [
  'Transparent project rates and open bid comparisons.',
  'Digital contractor estimation with clear, comparable unit rates.',
  'Quality site supervision from measurement through progress.',
] as const;

const VALUES = [
  'Transparency in pricing and project records.',
  'Digital estimates owners and contractors can compare.',
  'Consistent site supervision through each project stage.',
] as const;

const SUMMARY = [
  'Owners post project requirements and compare contractor estimates.',
  'Verified trades submit rates under the same unit rules.',
  'Field supervision stays tied to the project record.',
] as const;

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
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PointList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
      subtitle="BuilBid helps owners and contractors compare digital estimates and supervise site work with clear records."
    >
      <OpenSection title="Our Mission">
        <PointList items={MISSION} />
      </OpenSection>

      <OpenSection title="Core Values">
        <PointList items={VALUES} />
      </OpenSection>

      <OpenSection title="What we do">
        <PointList items={SUMMARY} />
      </OpenSection>

      <section className="border-t border-border/40 pt-8">
        <h2 className="text-base font-medium tracking-tight text-foreground">
          Start a project
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Post work, compare contractor estimates, and keep site supervision on record.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
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

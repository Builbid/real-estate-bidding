import type { Metadata } from 'next';
import Link from 'next/link';
import { HardHat, MapPinned, TrendingUp, Wallet } from 'lucide-react';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Join BuilBid as a Field Construction Supervisor and lead site management across Assam.',
};

const WHY_JOIN = [
  {
    title: 'Local construction impact',
    body: 'Help owners and contractors across Assam run clearer site work, from first measurement through handover.',
    icon: MapPinned,
  },
  {
    title: 'Hands-on site leadership',
    body: 'Lead real projects in the field: visits, supervision, and day-to-day coordination on active sites.',
    icon: HardHat,
  },
] as const;

const WHAT_WE_OFFER = [
  {
    title: 'Career growth',
    body: 'Build a supervisor career with responsibility that grows as you take on more sites and teams.',
    icon: TrendingUp,
  },
  {
    title: 'Competitive field incentives',
    body: 'Earn field incentives tied to the sites you supervise and the work you move forward.',
    icon: Wallet,
  },
] as const;

function FeatureCards({
  items,
}: {
  items: readonly {
    title: string;
    body: string;
    icon: typeof MapPinned;
  }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="rounded-xl border border-border bg-card/70 p-4"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function CareersPage() {
  return (
    <StaticPageShell
      title="Careers at BuilBid"
      subtitle="Join BuilBid in transforming construction operations across Assam. We are looking for dedicated team members to lead field management and site supervision."
    >
      <StaticSection title="Why join us">
        <FeatureCards items={WHY_JOIN} />
      </StaticSection>

      <StaticSection title="What we offer">
        <FeatureCards items={WHAT_WE_OFFER} />
      </StaticSection>

      <StaticSection title="Open roles">
        <div className="rounded-xl border border-border bg-card/70 p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              Field Construction Supervisor / Site Officer
            </h3>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Full-Time / On-Site
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Assam (Nagaon, Morigaon & Nearby Regions)
          </p>
          <p>
            Responsible for site measurements, contractor agreements, site visits, cost
            estimates, and real-time project supervision on the BuilBid platform.
          </p>
        </div>
      </StaticSection>

      <StaticSection title="How to apply">
        <p>Apply for the Field Construction Supervisor role using the registration form.</p>
        <Button asChild className="mt-1">
          <Link href="/admin/signup">Apply for Supervisor Role</Link>
        </Button>
      </StaticSection>
    </StaticPageShell>
  );
}

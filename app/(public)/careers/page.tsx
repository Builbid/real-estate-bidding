import type { Metadata } from 'next';
import Link from 'next/link';
import { HardHat, MapPinned, TrendingUp, Wallet } from 'lucide-react';
import {
  PLATFORM_COPY,
  PLATFORM_H2,
  PLATFORM_H3,
  StaticPageShell,
} from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Join BuilBid as a Field Construction Supervisor and lead field operations, site supervision, and quality execution.',
};

const WHY_JOIN = [
  {
    title: 'Direct construction impact',
    body: 'Help owners and contractors execute seamless site work, from initial measurement through final project handover.',
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

function OpenFeatures({
  title,
  items,
}: {
  title: string;
  items: readonly {
    title: string;
    body: string;
    icon: typeof MapPinned;
  }[];
}) {
  return (
    <section className="border-t border-border/40 pt-8">
      <h2 className={PLATFORM_H2}>{title}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 sm:gap-8">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="min-w-0">
              <h3 className={`${PLATFORM_H3} inline-flex items-center gap-2`}>
                {item.title}
                <Icon
                  className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                  aria-hidden
                />
              </h3>
              <p className={`mt-2 ${PLATFORM_COPY}`}>{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function CareersPage() {
  return (
    <StaticPageShell
      title="Careers at BuilBid"
      subtitle="Join BuilBid in transforming construction operations and site management. We are looking for dedicated team members to lead field operations, site supervision, and quality execution."
    >
      <OpenFeatures title="Why join us" items={WHY_JOIN} />
      <OpenFeatures title="What we offer" items={WHAT_WE_OFFER} />

      <section className="border-t border-border/40 pt-8">
        <h2 className={PLATFORM_H2}>Open roles</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className={PLATFORM_H3}>Field Construction Supervisor / Site Officer</h3>
            <p className={`mt-1 ${PLATFORM_COPY}`}>All Over Assam</p>
          </div>
          <span className="inline-flex w-fit shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium tracking-wide text-foreground/80">
            Full-Time / On-Site
          </span>
        </div>
        <p className={`mt-4 ${PLATFORM_COPY}`}>
          Responsible for site measurements, contractor agreements, site visits, cost
          estimates, and real-time project supervision on the BuilBid platform.
        </p>
      </section>

      <section className="border-t border-border/40 pt-8">
        <h2 className={PLATFORM_H2}>How to apply</h2>
        <p className={`mt-4 ${PLATFORM_COPY}`}>
          Apply for the Field Construction Supervisor role using the registration form.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/signup">Apply for Supervisor Role</Link>
        </Button>
      </section>
    </StaticPageShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, BadgeCheck, Layers3, Shield, Sparkles, Users } from 'lucide-react';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'BuilBid is a next-generation bidding ecosystem transforming real estate development through algorithmic transparency, real-time rate discovery, and verified trade networks.',
};

const GLASS_CARD =
  'rounded-2xl border border-black/10 bg-black/[0.03] backdrop-blur-md dark:border-white/10 dark:bg-white/5';

const PILLARS = [
  {
    icon: Activity,
    title: 'Real-Time Bidding Engine',
    body: 'Transparent live leaderboards surface the most competitive rates as they land — driving optimal procurement costs without back-channel deals.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Trade Network',
    body: 'Vetted skilled specialists across Mistri, Electricians, Painters, Plumbers, and Interior Specialists — so every bid comes from a qualified professional.',
  },
  {
    icon: Layers3,
    title: 'Standardized Pricing',
    body: 'Clear per-sqft and per-point bidding parameters replace guesswork and hidden extras. Every participant competes on the same unit-rate rules.',
  },
] as const;

const AUDIENCES = [
  {
    icon: Users,
    title: 'Property Owners & Builders',
    body: 'Post scoped work, watch live auctions unfold, and select partners on verified rates — not relationships or middleman markups.',
  },
  {
    icon: Shield,
    title: 'Verified Contractors & Trade Professionals',
    body: 'Compete on a level field. Win work through transparent rankings, standardized unit rates, and a profile that travels with every bid.',
  },
] as const;

function GlassSection({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(GLASS_CARD, 'p-6 sm:p-8', className)}>
      {eyebrow && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <StaticPageShell
      className="max-w-4xl"
      headerClassName="border-black/10 bg-black/[0.03] backdrop-blur-md dark:border-white/10 dark:bg-white/5 p-8 sm:p-10"
      title="Empowering Modern Construction Procurement"
      subtitle="BuilBid is a next-generation bidding ecosystem transforming real estate development through algorithmic transparency, real-time rate discovery, and verified trade networks."
    >
      <GlassSection eyebrow="Mission" title="Open markets. Clear rates. No middlemen.">
        <p>
          BuilBid replaces opaque, relationship-driven construction deals with competitive live
          auctions — where every qualified professional competes in the open. Property owners
          get market-clear pricing. Trade specialists get a fair shot at winning work on merit,
          not on who they know.
        </p>
        <p>
          Standardized unit-rate benchmarking (₹/sqft, ₹/point, and scoped add-on rates) makes
          bids comparable in real time. Algorithmic leaderboards remove guesswork. Direct
          owner-to-contractor matching eliminates middleman markups that quietly inflate
          project cost across modern urban developments.
        </p>
      </GlassSection>

      <div className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <article key={title} className={cn(GLASS_CARD, 'p-5 sm:p-6')}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <Icon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>

      <GlassSection eyebrow="Who we serve" title="Built for owners and verified trades.">
        <div className="grid gap-4 not-prose sm:grid-cols-2">
          {AUDIENCES.map(({ icon: Icon, title, body }) => (
            <div key={title} className={cn(GLASS_CARD, 'p-5')}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <Icon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </GlassSection>

      <GlassSection eyebrow="Platform" title="How BuilBid works">
        <p>
          Clients publish construction projects with precise scope — area, work type, timelines,
          and unit-rate parameters. Verified trade professionals submit live bids during a
          time-bound auction. Rankings update instantly so everyone sees the same competitive
          picture.
        </p>
        <p>
          When bidding closes, owners review the leaderboard, compare rates against profiles,
          and select the partner that fits the project. Contact details stay private until a
          match is made — protecting both sides inside a next-generation construction ecosystem.
        </p>
      </GlassSection>

      <GlassSection eyebrow="Principles" title="What we optimize for">
        <ul className="grid gap-3 sm:grid-cols-2 list-none pl-0">
          <li>
            <strong className="text-foreground">Transparency</strong>
            <span className="block mt-1">Open live rankings, explicit specs, and no hidden margins.</span>
          </li>
          <li>
            <strong className="text-foreground">Privacy</strong>
            <span className="block mt-1">Contact details stay protected until both parties connect.</span>
          </li>
          <li>
            <strong className="text-foreground">Fair competition</strong>
            <span className="block mt-1">Verified participants, standardized rules, equal visibility.</span>
          </li>
          <li>
            <strong className="text-foreground">Trust</strong>
            <span className="block mt-1">Vetted trade networks so owners can award work with confidence.</span>
          </li>
        </ul>
      </GlassSection>

      <section className={cn(GLASS_CARD, 'p-6 sm:p-8 text-center')}>
        <Sparkles className="mx-auto mb-3 h-5 w-5 text-emerald-500 dark:text-emerald-400" />
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Ready to procure smarter?</h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Whether you are building your next property or scaling a verified trade practice,
          BuilBid is live nationwide.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/signup">Create a free account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/#live-auctions">Explore live auctions</Link>
          </Button>
        </div>
      </section>
    </StaticPageShell>
  );
}

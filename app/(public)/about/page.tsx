import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about BuilBid — Assam\'s professional construction bidding platform connecting clients with verified contractors and firms.',
};

export default function AboutPage() {
  return (
    <StaticPageShell
      title="About BuilBid"
      subtitle="We are building a transparent, modern marketplace for real estate construction procurement in Assam and across Northeast India."
    >
      <StaticSection title="Our mission">
        <p>
          BuilBid exists to replace opaque, relationship-driven construction deals with open,
          time-bound auctions where every qualified builder competes on merit. Clients
          deserve market-clear pricing. Contractors and construction firms deserve a fair shot
          at winning work — regardless of who they know.
        </p>
        <p>
          We built BuilBid because the construction industry in our region still runs on
          phone calls, WhatsApp forwards, and guesswork. That leaves clients overpaying and
          skilled builders underutilized. Our platform brings structure, visibility, and
          accountability to every project.
        </p>
      </StaticSection>

      <StaticSection title="What we do">
        <p>
          BuilBid is a multi-role construction bidding platform. Clients post real
          estate projects with clear specifications — plot area, construction type (RCC or
          Assam-type), timelines, and scope. Verified labour contractors and construction
          firms submit competitive per-sqft rate bids during a live 24-hour auction window.
        </p>
        <p>
          Rankings update in real time. When bidding closes, clients review anonymized
          leaderboards, compare rates and builder profiles, and select the partner that
          best fits their project — all without exposing private contact details until a
          match is made.
        </p>
      </StaticSection>

      <StaticSection title="Who we serve">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Clients</strong> — homeowners, developers,
            and landowners posting residential and commercial construction projects.
          </li>
          <li>
            <strong className="text-foreground">Labour contractors</strong> — skilled builders
            bidding labour-only contracts where the client supplies materials.
          </li>
          <li>
            <strong className="text-foreground">Construction firms</strong> — turnkey contractors
            bidding complete ₹/sqft rates covering materials, labour, and finishing.
          </li>
        </ul>
      </StaticSection>

      <StaticSection title="Built for Assam, designed to scale">
        <p>
          We launched with deep focus on Assam&apos;s construction ecosystem — local districts,
          RCC and Assam-type building norms, and the realities of how projects are scoped and
          priced here. Our long-term vision is to become the trusted bidding infrastructure
          for construction procurement across India, starting where we know the market best.
        </p>
      </StaticSection>

      <StaticSection title="Our values">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-foreground">Transparency</strong> — open rate rankings, clear project specs, no hidden margins.</li>
          <li><strong className="text-foreground">Privacy</strong> — contact details stay protected until both parties agree to connect.</li>
          <li><strong className="text-foreground">Fair competition</strong> — verified participants, standardized bidding rules, equal visibility.</li>
          <li><strong className="text-foreground">Trust</strong> — we verify builders and firms so owners can bid with confidence.</li>
        </ul>
      </StaticSection>

      <StaticSection title="Get started">
        <p>
          Whether you are planning your dream home or growing your contracting business,
          BuilBid is ready for you.{' '}
          <Link href="/signup" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Create a free account
          </Link>{' '}
          or explore{' '}
          <Link href="/#live-auctions" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            live auctions
          </Link>{' '}
          on the homepage.
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}

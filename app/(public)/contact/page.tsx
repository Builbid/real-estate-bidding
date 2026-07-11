import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Clock, MessageSquare } from 'lucide-react';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the BuilBid team for support, partnerships, and general inquiries.',
};

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    label: 'General inquiries',
    value: 'hello@builbid.in',
    href: 'mailto:hello@builbid.in',
  },
  {
    icon: MessageSquare,
    label: 'Customer support',
    value: 'support@builbid.in',
    href: 'mailto:support@builbid.in',
  },
  {
    icon: Mail,
    label: 'Partnerships & media',
    value: 'partners@builbid.in',
    href: 'mailto:partners@builbid.in',
  },
] as const;

export default function ContactPage() {
  return (
    <StaticPageShell
      title="Contact Us"
      subtitle="We are here to help clients, contractors, and construction firms get the most out of BuilBid."
    >
      <StaticSection title="Reach our team">
        <p>
          Have a question about posting a project, placing a bid, or verifying your account?
          Send us an email and we will respond within one business day. For urgent auction-related
          issues during a live bidding window, mention &ldquo;Urgent&rdquo; in your subject line.
        </p>
        <div className="grid gap-4 not-prose mt-4">
          {CONTACT_CHANNELS.map(({ icon: Icon, label, value, href }) => (
            <a
              key={value}
              href={href}
              className="flex items-start gap-4 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-emerald-500/30 hover:bg-card"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Icon className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
              </div>
            </a>
          ))}
        </div>
      </StaticSection>

      <StaticSection title="Office">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">BuilBid</p>
            <p>Guwahati, Assam, India</p>
            <p className="text-xs mt-1">Serving clients and builders across Assam and Northeast India.</p>
          </div>
        </div>
      </StaticSection>

      <StaticSection title="Support hours">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p>Monday – Saturday: 9:00 AM – 6:00 PM IST</p>
            <p>Sunday & public holidays: email only (next business day response)</p>
          </div>
        </div>
      </StaticSection>

      <StaticSection title="Before you write">
        <p>
          <strong className="text-foreground">Account & login issues:</strong> include the email
          address registered on BuilBid and a brief description of the problem.
        </p>
        <p>
          <strong className="text-foreground">Bidding disputes:</strong> reference the project
          title and auction date so we can locate the record quickly.
        </p>
        <p>
          <strong className="text-foreground">New to BuilBid?</strong> Start with our{' '}
          <Link href="/about" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            About page
          </Link>{' '}
          or{' '}
          <Link href="/signup" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            create an account
          </Link>.
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}

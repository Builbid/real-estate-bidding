import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MessageCircle, Phone } from 'lucide-react';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';
import {
  BUILBID_MATERIALS_CONTACT,
  materialsWhatsAppHref,
} from '@/lib/contact/official';

export const metadata: Metadata = {
  title: 'Materials',
  description:
    'Talk to the BuilBid materials desk about cement, steel, bricks, tiles, and other construction supplies. Call, email, or WhatsApp our official contacts.',
};

const CONTACT_CHANNELS = [
  {
    icon: Phone,
    label: 'Official Phone Number',
    value: BUILBID_MATERIALS_CONTACT.phoneDisplay,
    href: `tel:${BUILBID_MATERIALS_CONTACT.phoneTel}`,
    hint: 'Direct line to the materials desk, Monday – Saturday.',
  },
  {
    icon: Mail,
    label: 'Email ID',
    value: BUILBID_MATERIALS_CONTACT.email,
    href: `mailto:${BUILBID_MATERIALS_CONTACT.email}?subject=Materials%20enquiry%20-%20BuilBid`,
    hint: 'Share quantities, brands, and delivery location for a faster reply.',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: `Chat on WhatsApp · ${BUILBID_MATERIALS_CONTACT.phoneDisplay}`,
    href: materialsWhatsAppHref(),
    hint: 'Opens WhatsApp with a pre-filled materials enquiry to our official number.',
    external: true,
  },
] as const;

export default function MaterialsPage() {
  return (
    <StaticPageShell
      title="Materials"
      subtitle="Source construction materials through BuilBid. Reach our materials desk directly by phone, email, or WhatsApp."
    >
      <StaticSection title="Talk to the materials desk">
        <p>
          Whether you need cement, TMT steel, bricks, sand, tiles, electrical fittings, or plumbing
          supplies, our team can connect you with verified suppliers and help you compare options
          for projects across Assam and Northeast India.
        </p>
        <div className="grid gap-4 not-prose mt-4">
          {CONTACT_CHANNELS.map(({ icon: Icon, label, value, href, hint, ...rest }) => {
            const external = 'external' in rest && rest.external;
            return (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-start gap-4 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-emerald-500/30 hover:bg-card"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Icon className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
              </a>
            );
          })}
        </div>
      </StaticSection>

      <StaticSection title="Support hours">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p>Monday – Saturday: 9:00 AM – 6:00 PM IST</p>
            <p>Sunday & public holidays: email and WhatsApp only (next business day response)</p>
          </div>
        </div>
      </StaticSection>

      <StaticSection title="Before you write">
        <p>
          Include the project location, material type, approximate quantity, and preferred brand or
          grade so we can route your enquiry quickly.
        </p>
        <p>
          Looking for labour or a construction firm instead? Browse{' '}
          <Link href="/projects" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            All Projects
          </Link>{' '}
          or visit our{' '}
          <Link href="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Contact page
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}

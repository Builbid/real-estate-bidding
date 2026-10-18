import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, IndianRupee, Mail, MessageCircle, Phone, ShieldCheck, Truck } from 'lucide-react';
import {
  PLATFORM_COPY,
  StaticPageShell,
  StaticSection,
} from '@/components/marketing/StaticPageShell';
import {
  BUILBID_MATERIALS_CONTACT,
  materialsWhatsAppHref,
} from '@/lib/contact/official';

export const metadata: Metadata = {
  title: 'Materials',
  description:
    'Order construction materials with doorstep delivery, guaranteed quality, and fair market rates. Call, email, or WhatsApp the BuilBid materials desk every day, 9:00 AM – 9:00 PM IST.',
};

const BENEFITS = [
  {
    icon: Truck,
    title: 'Direct Doorstep Delivery',
    body: 'No need to visit multiple shops. Order materials with ease and get direct delivery right at your project site.',
    iconWrap: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  },
  {
    icon: ShieldCheck,
    title: 'Uncompromised Quality',
    body: 'Guaranteed premium quality standards. Materials supplied exactly as per required technical specifications without any compromise.',
    iconWrap: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
  },
  {
    icon: IndianRupee,
    title: 'Fair Market Pricing',
    body: 'Transparent & competitive market rates with zero hidden charges or excess costs.',
    iconWrap: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
  },
] as const;

const CONTACT_CHANNELS = [
  {
    icon: Phone,
    label: 'Official Phone / Call',
    value: `${BUILBID_MATERIALS_CONTACT.phoneDisplay} (Daily 9:00 AM – 9:00 PM)`,
    href: `tel:${BUILBID_MATERIALS_CONTACT.phoneTel}`,
    hint: 'Call the materials desk every day between 9:00 AM and 9:00 PM IST.',
  },
  {
    icon: Mail,
    label: 'Email ID',
    value: BUILBID_MATERIALS_CONTACT.email,
    href: `mailto:${BUILBID_MATERIALS_CONTACT.email}?subject=Materials%20enquiry%20-%20BuilBid`,
    hint: 'Email support is active every day between 9:00 AM and 9:00 PM IST.',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: `Chat on WhatsApp (${BUILBID_MATERIALS_CONTACT.phoneDisplay})`,
    href: materialsWhatsAppHref(),
    hint: 'WhatsApp support is active every day between 9:00 AM and 9:00 PM IST.',
    external: true,
  },
] as const;

export default function MaterialsPage() {
  return (
    <StaticPageShell
      className="max-w-4xl px-4 sm:px-4"
      title="Materials"
      subtitle="Order construction materials with doorstep delivery, guaranteed quality, and fair market pricing. Phone, email, and WhatsApp are open every day."
    >
      <section aria-label="Materials service highlights">
        <div className="grid gap-3 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body, iconWrap }) => (
            <article
              key={title}
              className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-4"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${iconWrap}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <StaticSection title="Talk to the materials desk">
        <p className={PLATFORM_COPY}>
          Whether you need cement, TMT steel, bricks, sand, tiles, electrical fittings, or plumbing
          supplies, order through the materials desk and we deliver to your project site.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {CONTACT_CHANNELS.map(({ icon: Icon, label, value, href, hint, ...rest }) => {
            const external = 'external' in rest && rest.external;
            return (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-emerald-500/30 hover:bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{value}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
              </a>
            );
          })}
        </div>
      </StaticSection>

      <StaticSection title="Support hours">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Monday – Sunday: 9:00 AM – 9:00 PM IST (Active Every Day)
            </p>
            <p className={`mt-1 text-sm ${PLATFORM_COPY}`}>
              Phone, Email, and WhatsApp support are all actively available every day between
              9:00 AM and 9:00 PM IST.
            </p>
          </div>
        </div>
      </StaticSection>

      <StaticSection title="Before you write">
        <p className={PLATFORM_COPY}>
          Include the project location, material type, approximate quantity, and preferred brand or
          grade so we can route your enquiry quickly. Looking for labour or a construction firm
          instead? Browse{' '}
          <Link href="/projects" className="text-emerald-600 hover:underline dark:text-emerald-400">
            All Projects
          </Link>{' '}
          or visit our{' '}
          <Link href="/contact" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Contact page
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}

import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';
import { BUILBID_MATERIALS_CONTACT } from '@/lib/contact/official';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Reach BuilBid customer support at support@builbid.in, by phone, or on WhatsApp.',
};

const COPY = 'max-w-prose text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8';

const WHATSAPP_HREF = `https://wa.me/${BUILBID_MATERIALS_CONTACT.whatsappE164}`;

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
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function ContactPage() {
  return (
    <StaticPageShell
      className="max-w-3xl"
      headerClassName="mb-8 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
      eyebrowClassName="mb-2 text-xs font-medium tracking-[0.16em]"
      titleClassName="text-2xl font-medium sm:text-3xl"
      title="Contact Us"
      subtitle="Customer support for project owners and contractors."
    >
      <OpenSection title="Customer Support">
        <a
          href="mailto:support@builbid.in"
          className="inline-flex items-center gap-2 text-base font-medium text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          support@builbid.in
        </a>
        <p className={COPY}>
          Questions about posting a project, placing a bid, or your account can be sent to this
          address.
        </p>
      </OpenSection>

      <OpenSection title="Office">
        <p className="inline-flex items-start gap-2 text-[15px] leading-7 text-foreground sm:text-base sm:leading-8">
          <MapPin className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span>Dispur, Guwahati - 781006, Assam, India</span>
        </p>
      </OpenSection>

      <OpenSection title="Working Hours">
        <p className="inline-flex items-start gap-2 text-[15px] leading-7 text-foreground sm:text-base sm:leading-8">
          <Clock className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span>Monday to Saturday: 9:00 AM – 6:00 PM</span>
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={`tel:${BUILBID_MATERIALS_CONTACT.phoneTel}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Call {BUILBID_MATERIALS_CONTACT.phoneDisplay}
          </a>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            WhatsApp {BUILBID_MATERIALS_CONTACT.phoneDisplay}
          </a>
        </div>
      </OpenSection>

      <OpenSection title="Issue & Complaint Guidelines">
        <p className={COPY}>
          <span className="font-medium text-foreground">Account & Login Issues. </span>
          For account access, email problems, or login help, include the email address registered
          on BuilBid and a short description of what happens when you try to sign in.
        </p>
        <p className={COPY}>
          <span className="font-medium text-foreground">Site Workmanship & Quality Control Complaints. </span>
          Property owners can report a contractor or worker who skips the site checklist, delivers
          sub-standard work, or breaks quality control standards. Include the project title and
          what was found on site.
        </p>
        <p className={COPY}>
          <span className="font-medium text-foreground">Payment & Billing Support. </span>
          Property owners and contractors or labour can report payment delays, billing disputes, or
          escrow and transaction issues. Include the project title, the amount, and the date of the
          payment or invoice.
        </p>
      </OpenSection>
    </StaticPageShell>
  );
}

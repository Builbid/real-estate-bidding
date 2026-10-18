import type { Metadata } from 'next';
import { ClipboardList, Laptop, Users } from 'lucide-react';
import { PLATFORM_COPY, PLATFORM_H2, StaticPageShell } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'BuilBid’s work culture supports field leadership with digital tools and structured site measurement workflows. Future hiring announcements are published on this page.',
};

const HIGHLIGHTS = [
  {
    icon: Users,
    title: 'Work culture and field leadership',
    body: 'The culture is hands-on and site-first. Supervisors grow by leading real projects: visits, coordination, and day-to-day responsibility that increases as they take on more sites and teams.',
  },
  {
    icon: Laptop,
    title: 'Technology-driven construction management',
    body: 'Field supervisors and site professionals are empowered with digital tools and structured site measurement workflows, so measurements, agreements, and project records stay organized from the first visit through handover.',
  },
  {
    icon: ClipboardList,
    title: 'Direct construction impact',
    body: 'The work helps owners and contractors carry a site from initial measurement to final handover, with field incentives tied to the sites a supervisor moves forward.',
  },
] as const;

export default function CareersPage() {
  return (
    <StaticPageShell
      className="max-w-4xl px-4 sm:px-6"
      eyebrow="Careers"
      title="Careers at BuilBid"
      subtitle="A technology-driven construction management environment where field leaders grow through real site responsibility and clear digital workflows."
    >
      <div className="space-y-8">
        <section>
          <h2 className={PLATFORM_H2}>Why Work With BuilBid</h2>
          <p className={`mt-2 text-sm sm:text-[15px] ${PLATFORM_COPY}`}>
            BuilBid’s work culture is built around field leadership growth inside a
            technology-driven construction management environment. People closest to the site are
            trusted with the record of the work, not only the visit itself.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold leading-snug text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-label="Current hiring status"
          className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5"
        >
          <h2 className={PLATFORM_H2}>Current hiring status</h2>
          <p className={`mt-2 text-sm sm:text-[15px] ${PLATFORM_COPY}`}>
            There are currently no active job openings or open supervisor roles. Any future
            employment opportunities and hiring announcements for field supervisors, site officers,
            or corporate roles will be published directly on this page. Please check back later for
            future updates.
          </p>
        </section>
      </div>
    </StaticPageShell>
  );
}

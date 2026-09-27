import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PLATFORM_COPY,
  PLATFORM_H3,
  StaticPageShell,
  StaticSection,
} from '@/components/marketing/StaticPageShell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Join BuilBid as a Field Construction Supervisor and lead field operations, site supervision, and quality execution.',
};

export default function CareersPage() {
  return (
    <StaticPageShell
      title="Careers at BuilBid"
      subtitle="Join BuilBid in transforming construction operations and site management. We are looking for dedicated team members to lead field operations, site supervision, and quality execution."
    >
      <StaticSection title="Why join us">
        <p className={PLATFORM_COPY}>
          Direct construction impact: help owners and contractors execute seamless site work, from
          initial measurement through final project handover. Hands-on site leadership: lead real
          projects in the field, including visits, supervision, and day-to-day coordination on
          active sites.
        </p>
      </StaticSection>

      <StaticSection title="What we offer">
        <p className={PLATFORM_COPY}>
          Career growth: build a supervisor career with responsibility that grows as you take on
          more sites and teams. Competitive field incentives: earn field incentives tied to the
          sites you supervise and the work you move forward.
        </p>
      </StaticSection>

      <StaticSection title="Open roles">
        <h3 className={PLATFORM_H3}>Field Construction Supervisor / Site Officer</h3>
        <p className={`mt-2 ${PLATFORM_COPY}`}>
          All Over Assam. Full-Time / On-Site. Responsible for site measurements, contractor
          agreements, site visits, cost estimates, and real-time project supervision on the
          BuilBid platform.
        </p>
      </StaticSection>

      <StaticSection title="How to apply">
        <p className={PLATFORM_COPY}>
          Apply for the Field Construction Supervisor role using the registration form.
        </p>
        <Button asChild className="mt-3">
          <Link href="/admin/signup">Apply for Supervisor Role</Link>
        </Button>
      </StaticSection>
    </StaticPageShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { RoleTermsDocumentView } from '@/components/legal/RoleTermsDocumentView';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';
import { ROLE_TERMS } from '@/lib/legal/roleTerms';

const doc = ROLE_TERMS.owner;

export const metadata: Metadata = {
  title: 'Terms & Conditions for Homeowners',
  description:
    'Terms for homeowners on BuilBid, covering material supply, the 48-hour selection window, site visits, fixed rates, and official payments.',
};

export default function OwnerTermsPage() {
  return (
    <StaticPageShell
      title={doc.heading}
      subtitle="These terms apply when you register as a homeowner or project owner on BuilBid."
      lastUpdated="16 October 2026"
    >
      <RoleTermsDocumentView audience="owner" showHeading={false} />
      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        See also the{' '}
        <Link
          href="/privacy"
          className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          Privacy Policy
        </Link>.
      </p>
    </StaticPageShell>
  );
}

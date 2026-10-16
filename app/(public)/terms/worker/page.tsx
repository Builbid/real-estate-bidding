import type { Metadata } from 'next';
import Link from 'next/link';
import { RoleTermsDocumentView } from '@/components/legal/RoleTermsDocumentView';
import { StaticPageShell } from '@/components/marketing/StaticPageShell';
import { ROLE_TERMS } from '@/lib/legal/roleTerms';

const doc = ROLE_TERMS.worker;

export const metadata: Metadata = {
  title: 'Terms & Conditions for Workers & Contractors',
  description:
    'Terms for Worker and Contractor Partners on BuilBid, covering fixed unit rates, material-delay reporting, site visits, payments, commission, and site conduct.',
};

export default function WorkerTermsPage() {
  return (
    <StaticPageShell
      title={doc.heading}
      subtitle="These terms apply when you register as a Worker or Contractor Partner on BuilBid."
      lastUpdated="16 October 2026"
    >
      <RoleTermsDocumentView audience="worker" showHeading={false} />
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

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/supabase/getUser';
import { listMyProjectDocumentsAction } from '@/app/actions/documents';
import { DocumentsSection } from '@/components/profile/DocumentsSection';
import { isProfileRoutedDocument } from '@/lib/documents/constants';
import { Button } from '@/components/ui/button';

export default async function ProfileDocumentsPage() {
  await getAuthUser();
  const { documents: allDocuments } = await listMyProjectDocumentsAction();
  const documents = allDocuments.filter((doc) => isProfileRoutedDocument(doc.document_type));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900 sm:p-6">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
        <Link href="/dashboard/profile">
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
      </Button>

      <DocumentsSection documents={documents} />
    </div>
  );
}

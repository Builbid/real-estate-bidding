export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/supabase/getUser';
import { listMyProjectDocumentsAction } from '@/app/actions/documents';
import { DocumentsSection } from '@/components/profile/DocumentsSection';
import { Button } from '@/components/ui/button';

export default async function ProfileDocumentsPage() {
  await getAuthUser();
  const { documents } = await listMyProjectDocumentsAction();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
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

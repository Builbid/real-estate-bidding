import Link from 'next/link';
import { ChevronRight, Folder } from 'lucide-react';
import { listMyProjectDocumentsAction } from '@/app/actions/documents';
import { isProfileHubDocument } from '@/lib/documents/constants';

/** Folder entry on owner and contractor dashboards. Files open from the profile document hub. */
export async function AccountDocumentsPanel() {
  const { documents: allDocuments } = await listMyProjectDocumentsAction();
  const documents = allDocuments.filter((row) => isProfileHubDocument(row.document_type));
  if (documents.length === 0) return null;

  return (
    <section aria-label="Project documents">
      <Link
        href="/dashboard/profile#documents"
        className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand/40 dark:border-slate-700/80 dark:bg-slate-900"
      >
        <Folder className="h-5 w-5 shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Documents
          </span>
          <span className="mt-0.5 block text-sm text-slate-900 dark:text-slate-100">View uploaded documents</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  );
}

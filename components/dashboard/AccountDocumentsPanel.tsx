import Link from 'next/link';
import { Folder } from 'lucide-react';

/** Borderless documents entry on the homeowner and mistri dashboards. */
export function AccountDocumentsPanel() {
  return (
    <section aria-label="Project documents">
      <Link
        href="/dashboard/profile#documents"
        className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-900 hover:text-brand dark:text-slate-100"
      >
        <Folder className="h-5 w-5 text-brand" aria-hidden />
        Documents
      </Link>
    </section>
  );
}

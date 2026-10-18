import Link from 'next/link';
import { Folder } from 'lucide-react';

/** Opens the dedicated Selected Projects view. This is a folder link, not an accordion. */
export function SelectedProjectsFolder({ count }: { count: number }) {
  return (
    <section className="min-w-0">
      <Link
        href="/dashboard/owner/projects/selected"
        className="flex w-full items-center gap-3 rounded-xl py-2 text-left transition-colors hover:bg-muted/40"
      >
        <Folder className="h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
        <span className="min-w-0 flex-1 text-sm font-bold text-foreground">Selected Projects</span>
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      </Link>
    </section>
  );
}

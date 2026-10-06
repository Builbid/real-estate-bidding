'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Download, Eye, FileText, Folder, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hideProjectDocumentAction } from '@/app/actions/documents';
import { INVOICE_DOCUMENT_TYPES, isInvoiceDocument, presentedDocumentFileName } from '@/lib/documents/constants';
import type { ProjectDocument } from '@/lib/types';

type Branch = 'agreements' | 'invoices';

const AGREEMENT_FILE_ORDER = ['agreement', 'quality_control'] as const;

const AGREEMENT_FILE_LABEL: Record<(typeof AGREEMENT_FILE_ORDER)[number], string> = {
  agreement: 'Agreement Copy',
  quality_control: 'Quality Control Form',
};

const INVOICE_FILE_LABEL: Record<(typeof INVOICE_DOCUMENT_TYPES)[number], string> = {
  invoice: 'Payment Invoice',
  payment_invoice: 'Payment Invoice',
  receipt: 'Platform Billing Receipt',
  billing_receipt: 'Platform Billing Receipt',
  transaction: 'Transaction Record',
};

interface ProjectFolder {
  key: string;
  title: string;
  civil: boolean;
  files: ProjectDocument[];
  latestAt: string;
}

interface DocumentsSectionProps {
  documents: ProjectDocument[];
  /** Standalone documents page keeps a short intro. The profile card opens the hub only. */
  showIntro?: boolean;
}

function isCivilProject(projectName: string, serviceType?: string | null): boolean {
  const service = (serviceType ?? '').toLowerCase();
  if (
    service === 'labour_contractor' ||
    service === 'mistri' ||
    service === 'civil_construction' ||
    service === 'construction_firm'
  ) {
    return true;
  }
  if (service) return false;
  return /civil construction/i.test(projectName);
}

function folderTitle(doc: ProjectDocument): string {
  const name = doc.project_name?.trim() || 'Project';
  const id = doc.numeric_project_id?.trim();
  return id ? `${name} - ID: ${id}` : name;
}

function agreementFiles(docs: ProjectDocument[], civil: boolean): ProjectDocument[] {
  const allowed = civil ? AGREEMENT_FILE_ORDER : (['agreement'] as const);
  return allowed.flatMap((type) =>
    docs.filter((doc) => doc.document_type === type),
  );
}

function invoiceFiles(docs: ProjectDocument[]): ProjectDocument[] {
  return docs
    .filter((doc) => isInvoiceDocument(doc.document_type))
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function fileLabel(doc: ProjectDocument): string {
  if (doc.document_type in AGREEMENT_FILE_LABEL) {
    return AGREEMENT_FILE_LABEL[doc.document_type as keyof typeof AGREEMENT_FILE_LABEL];
  }
  if (doc.document_type in INVOICE_FILE_LABEL) {
    return INVOICE_FILE_LABEL[doc.document_type as keyof typeof INVOICE_FILE_LABEL];
  }
  return doc.file_name;
}

function buildFolders(documents: ProjectDocument[], branch: Branch): ProjectFolder[] {
  const byProject = new Map<string, ProjectDocument[]>();
  for (const doc of documents) {
    if (doc.document_type === 'site_checklist') continue;
    const key = doc.project_id || doc.numeric_project_id || doc.id;
    const group = byProject.get(key) ?? [];
    group.push(doc);
    byProject.set(key, group);
  }

  const folders: ProjectFolder[] = [];
  for (const [key, docs] of byProject) {
    const sample = docs[0];
    const civil = isCivilProject(sample.project_name, sample.service_type);
    const files = branch === 'agreements' ? agreementFiles(docs, civil) : invoiceFiles(docs);
    if (files.length === 0) continue;
    folders.push({
      key,
      title: folderTitle(sample),
      civil,
      files,
      latestAt: files.reduce((latest, doc) => (doc.created_at > latest ? doc.created_at : latest), files[0].created_at),
    });
  }

  return folders.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export function DocumentsSection({ documents, showIntro = true }: DocumentsSectionProps) {
  const router = useRouter();
  const [branch, setBranch] = useState<Branch>('agreements');
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const folders = useMemo(() => buildFolders(documents, branch), [documents, branch]);

  function openFile(id: string, disposition: 'inline' | 'attachment') {
    window.open(`/api/documents/file?id=${encodeURIComponent(id)}&disposition=${disposition}`, '_blank', 'noopener,noreferrer');
  }

  function toggleFolder(key: string) {
    setOpenKeys((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleRemove(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await hideProjectDocumentAction(id);
      setPendingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section>
      {showIntro ? (
        <>
          <h2 className="mb-1 inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <Folder className="h-4 w-4 text-muted-foreground" />
            Documents
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Agreements and invoices are grouped by project. Open a folder to view the files shared to this account.
          </p>
        </>
      ) : null}

      <div role="tablist" aria-label="Document branches" className="grid grid-cols-2 gap-2">
        <BranchTab
          active={branch === 'agreements'}
          onClick={() => setBranch('agreements')}
          label="Agreements"
        />
        <BranchTab
          active={branch === 'invoices'}
          onClick={() => setBranch('invoices')}
          label="Invoices"
        />
      </div>

      <div className="mt-3 space-y-2">
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {folders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {branch === 'agreements'
              ? 'No agreements yet. Signed project agreements shared to this account appear in a project folder.'
              : 'No invoices yet. Payment invoices, platform billing receipts, and transaction records appear here by project.'}
          </p>
        ) : (
          folders.map((folder) => {
            const open = Boolean(openKeys[`${branch}:${folder.key}`]);
            return (
              <div
                key={`${branch}:${folder.key}`}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-950/40"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  aria-expanded={open}
                  onClick={() => toggleFolder(`${branch}:${folder.key}`)}
                >
                  <Folder className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {folder.title}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700/80 dark:border-slate-700/80">
                    {folder.files.map((doc) => {
                      const busy = isPending && pendingId === doc.id;
                      return (
                        <li key={doc.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                              <span className="truncate">{fileLabel(doc)}</span>
                            </p>
                            <p className="mt-0.5 truncate pl-5 text-xs text-slate-500 dark:text-slate-400">
                              {presentedDocumentFileName(doc.document_type, doc.file_name)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-5 sm:pl-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openFile(doc.id, 'inline')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openFile(doc.id, 'attachment')}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                              disabled={busy}
                              onClick={() => handleRemove(doc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {busy ? 'Removing…' : 'Remove'}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function BranchTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white'
          : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
      }
    >
      {label}
    </button>
  );
}

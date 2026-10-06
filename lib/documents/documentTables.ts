import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectDocument } from '@/lib/types';

/** Primary document table, then the fallback used when it is missing from the API schema. */
export const DOCUMENT_TABLES = ['project_documents', 'site_checklist_documents'] as const;

export type DocumentTableName = (typeof DOCUMENT_TABLES)[number];

const PROVISION_SQL = `
create table if not exists public.site_checklist_documents (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null,
  numeric_project_id  text not null,
  project_name        text not null,
  document_type       text not null,
  file_name           text not null,
  storage_path        text,
  file_url            text,
  mime_type           text not null default 'application/pdf',
  owner_id            uuid not null,
  worker_id           uuid,
  owner_deleted       boolean not null default false,
  worker_deleted      boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id, document_type)
);

alter table public.site_checklist_documents enable row level security;

drop policy if exists "site_checklist_documents_select_party" on public.site_checklist_documents;
create policy "site_checklist_documents_select_party"
  on public.site_checklist_documents
  for select
  to authenticated
  using (
    (auth.uid() = owner_id and owner_deleted = false)
    or (auth.uid() = worker_id and worker_deleted = false)
  );

grant select on table public.site_checklist_documents to authenticated;
grant all on table public.site_checklist_documents to service_role;

create table if not exists public.shared_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null,
  worker_id uuid not null,
  shared_by uuid not null,
  snapshot jsonb not null,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists shared_agreements_project_id_uidx
  on public.shared_agreements (project_id);
alter table public.shared_agreements enable row level security;
drop policy if exists "shared_agreements_party_select" on public.shared_agreements;
create policy "shared_agreements_party_select"
  on public.shared_agreements
  for select
  to authenticated
  using (auth.uid() = owner_id or auth.uid() = worker_id);
grant select on table public.shared_agreements to authenticated;
grant all on table public.shared_agreements to service_role;

notify pgrst, 'reload schema';
`;

let provisioned = false;

export function isMissingDocumentTable(message: string | null | undefined): boolean {
  const text = message ?? '';
  return /schema cache|could not find the table|does not exist|invalid input value for enum|no unique or exclusion constraint/i.test(
    text,
  );
}

function databaseUrl(): string | null {
  const direct =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    '';
  if (direct.trim()) return direct.trim();

  const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!password.trim() || !supabaseUrl.trim()) return null;
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    if (!ref) return null;
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  } catch {
    return null;
  }
}

/** Creates the fallback document table and refreshes the API schema when a database URL is configured. */
export async function ensureDocumentTables(): Promise<boolean> {
  if (provisioned) return true;
  const connectionString = databaseUrl();
  if (!connectionString) return false;

  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(process.cwd() + '/package.json');
    const { Client } = require('pg') as {
      Client: new (config: {
        connectionString: string;
        ssl: { rejectUnauthorized: boolean };
      }) => {
        connect(): Promise<void>;
        query(sql: string): Promise<unknown>;
        end(): Promise<void>;
      };
    };
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      await client.query(PROVISION_SQL);
    } finally {
      await client.end();
    }
    provisioned = true;
    return true;
  } catch {
    return false;
  }
}

export async function upsertPartyDocument(
  admin: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ ok: true; table: DocumentTableName } | { ok: false; missing: boolean; error: string }> {
  const attempt = async () => {
    let lastError = 'Could not store the document.';
    let missing = false;
    for (const table of DOCUMENT_TABLES) {
      const { error } = await admin.from(table).upsert(row, { onConflict: 'project_id,document_type' });
      if (!error) return { ok: true as const, table, missing: false, error: '' };
      lastError = error.message;
      if (isMissingDocumentTable(error.message)) {
        missing = true;
        continue;
      }
      return { ok: false as const, table, missing: false, error: lastError };
    }
    return { ok: false as const, table: DOCUMENT_TABLES[0], missing, error: lastError };
  };

  const first = await attempt();
  if (first.ok) return { ok: true, table: first.table };
  if (!first.missing) return { ok: false, missing: false, error: first.error };

  const created = await ensureDocumentTables();
  if (created) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const second = await attempt();
    if (second.ok) return { ok: true, table: second.table };
    if (!second.missing) return { ok: false, missing: false, error: second.error };
    return { ok: false, missing: true, error: second.error };
  }

  return { ok: false, missing: true, error: first.error };
}

export function routedDocumentsFromSnapshot(snapshot: unknown): ProjectDocument[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const rows = (snapshot as { routedDocuments?: unknown }).routedDocuments;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is ProjectDocument => {
    if (!row || typeof row !== 'object') return false;
    const doc = row as Partial<ProjectDocument>;
    return typeof doc.id === 'string' && typeof doc.project_id === 'string' && typeof doc.document_type === 'string';
  });
}

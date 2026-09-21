import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { normalizeProjectId } from '@/lib/contract/projectId';

export {
  extractProjectIdFromRecord,
  extractProjectIdFromRequest,
  extractProjectIdFromSearchParams,
  normalizeProjectId,
} from '@/lib/contract/projectId';

export async function createAgreementLookupClient(email?: string | null) {
  if (isOfficialAdminEmail(email)) return createAdminClient();
  return createClient();
}

export async function loadAgreementProjectContext<
  T extends { id: string; owner_id: string; selected_builder_id: string | null },
>(
  projectId: string,
  userId: string,
  select: string,
): Promise<{ project: T; isAdmin: boolean } | { error: string; status: number }> {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  let isAdmin = isOfficialAdminEmail(user?.email);
  if (!isAdmin) {
    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role, is_admin, email')
      .eq('id', userId)
      .maybeSingle();
    isAdmin =
      profile?.role === 'admin' ||
      profile?.is_admin === true ||
      isOfficialAdminEmail(profile?.email);
  }

  const db = isAdmin ? createAdminClient() : sessionClient;
  const { data: project, errorMessage } = await findProjectByAnyId<T>(db, projectId, select);
  if (!project) {
    console.error('[agreement] Project lookup failed.', {
      projectId,
      userId,
      isAdmin,
      errorMessage,
    });
    return { error: 'Project not found.', status: 404 };
  }
  return { project, isAdmin };
}

export async function findProjectByAnyId<T extends { id: string }>(
  client: SupabaseClient,
  projectId: string,
  select: string,
): Promise<{ data: T | null; errorMessage: string | null }> {
  const id = normalizeProjectId(projectId);
  if (!id) {
    return { data: null, errorMessage: 'projectId is missing from the request.' };
  }

  const byId = await client.from('projects').select(select).eq('id', id).maybeSingle();
  if (byId.data) return { data: byId.data as unknown as T, errorMessage: null };

  const byNumeric = await client.from('projects').select(select).eq('numeric_id', id).maybeSingle();
  if (byNumeric.data) return { data: byNumeric.data as unknown as T, errorMessage: null };

  const message =
    byId.error?.message ||
    byNumeric.error?.message ||
    `No project matched id or project_id "${id}".`;
  return { data: null, errorMessage: message };
}

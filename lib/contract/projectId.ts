import { isPublicProjectId } from '@/lib/documents/constants';

export function normalizeProjectId(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  if (isPublicProjectId(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

export function extractProjectIdFromRecord(
  source: Record<string, unknown> | null | undefined,
): string {
  if (!source) return '';
  return (
    normalizeProjectId(source.projectId) ||
    normalizeProjectId(source.project_id) ||
    normalizeProjectId(source.numeric_id) ||
    normalizeProjectId(source.publicId) ||
    normalizeProjectId(source.id)
  );
}

export function extractProjectIdFromSearchParams(params: URLSearchParams): string {
  return (
    normalizeProjectId(params.get('projectId')) ||
    normalizeProjectId(params.get('project_id')) ||
    normalizeProjectId(params.get('numeric_id')) ||
    normalizeProjectId(params.get('id'))
  );
}

export async function extractProjectIdFromRequest(request: Request): Promise<string> {
  const fromQuery = extractProjectIdFromSearchParams(new URL(request.url).searchParams);
  if (fromQuery) return fromQuery;
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    return extractProjectIdFromRecord(body);
  } catch {
    return '';
  }
}

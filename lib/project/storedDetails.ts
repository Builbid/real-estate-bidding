/** JSONB work-requirement columns that may not exist on older production DBs. */
export const PROJECT_DETAIL_COLUMNS = [
  'drawing_details',
  'trade_details',
  'painter_details',
  'mistri_details',
] as const;

export type ProjectDetailColumn = (typeof PROJECT_DETAIL_COLUMNS)[number];

export function missingProjectsColumn(message: string): string | null {
  const match = message.match(
    /Could not find the '([^']+)' column of 'projects'/i,
  );
  return match?.[1] ?? null;
}

export function readNestedProjectDetail(
  project: {
    sub_configuration?: unknown;
    drawing_details?: unknown;
    trade_details?: unknown;
    painter_details?: unknown;
    mistri_details?: unknown;
  },
  key: ProjectDetailColumn,
): unknown {
  const top = project[key];
  if (top != null) return top;
  const sub = project.sub_configuration;
  if (sub && typeof sub === 'object' && key in sub) {
    return (sub as Record<string, unknown>)[key];
  }
  return null;
}

export function embedDetailsInSubConfiguration(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const current =
    payload.sub_configuration && typeof payload.sub_configuration === 'object'
      ? { ...(payload.sub_configuration as Record<string, unknown>) }
      : {};

  for (const key of PROJECT_DETAIL_COLUMNS) {
    if (payload[key] != null) {
      current[key] = payload[key];
    }
  }

  return { ...payload, sub_configuration: current };
}

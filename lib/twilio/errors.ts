/** Parse Twilio (or similar) JSON error bodies into a short log-friendly string. */
export function parseProviderError(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as { message?: string; code?: number };
    if (parsed.message) {
      return parsed.code ? `[${parsed.code}] ${parsed.message}` : parsed.message;
    }
  } catch {
    // plain text response
  }
  return raw.slice(0, 500);
}

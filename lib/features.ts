/**
 * Feature flags — flip these when launching a service publicly.
 * Existing firm accounts / data remain in the DB; only public entry points are gated.
 */

/** Construction Firm posting, signup, and browse surfaces. Set true to launch. */
export const CONSTRUCTION_FIRM_ENABLED = false;

export function isConstructionFirmEnabled(): boolean {
  return CONSTRUCTION_FIRM_ENABLED;
}

/**
 * TEMPORARY (prototype testing): when true, a project that has been closed (or whose bidding
 * window has ended) and has bids is automatically listed in the Supervisor "Agreements" tab as
 * an awarded agreement, with the lowest bidder as the provisional awardee. The supervisor then
 * taps "Receive / Accept Project" to open the agreement letter. No company-side processing step
 * is required, and the Site Visit Checklist is no longer mandatory before the agreement opens.
 *
 * Set to false to restore the normal flow (owner awards, then checklist, then agreement).
 * Plain module (no server-only imports) so client components can read it too.
 */
export const PROTOTYPE_AUTO_AGREEMENT = true;

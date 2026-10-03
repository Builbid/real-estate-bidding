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

/**
 * Prototype reset point (3 Oct 2026, 20:25 IST). In the Supervisor portal, auctions that ended
 * before this instant are legacy: they never appear in Agreements, and agreements approved
 * before it never appear in Completed Works. Both tabs therefore start at zero.
 */
export const PROTOTYPE_RESET_AT = '2026-10-03T14:55:00.000Z';

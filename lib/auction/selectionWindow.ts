/** Live bidding stays open for 24 hours after the project is posted. */
export const BIDDING_WINDOW_MS = 24 * 60 * 60 * 1000;

/** After bidding closes, the owner has 24 hours to award a worker. */
export const SELECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Hard cap: 24h bidding + 24h selection, measured from the post time. */
export const PROJECT_LIFETIME_MS = BIDDING_WINDOW_MS + SELECTION_WINDOW_MS;

export const BIDDING_DURATION_HELPER =
  'You can select a worker during the 24-hour live bidding window or during the 24-hour selection window that follows.';

/** Review-step value: the listing closes 48 hours after it is posted. */
export const SELECTION_WINDOW_REVIEW =
  '24 hours of live bidding, then 24 hours to select (48 hours from posting)';

type WindowProject = {
  created_at?: string | null;
  bidding_ends_at: string;
  selection_ends_at?: string | null;
  selected_builder_id?: string | null;
  status?: string | null;
};

function millis(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Latest moment the owner may still award a worker. Never later than 48 hours after posting. */
export function selectionDeadlineMs(project: WindowProject): number {
  const biddingEnds = millis(project.bidding_ends_at) ?? Date.now();
  const fromBidding = biddingEnds + SELECTION_WINDOW_MS;
  const posted = millis(project.created_at);
  const fromPosting = posted != null ? posted + PROJECT_LIFETIME_MS : fromBidding;
  const capped = Math.min(fromBidding, fromPosting);
  const stored = millis(project.selection_ends_at);
  return stored != null ? Math.min(stored, capped) : capped;
}

/**
 * Listings that must leave Live bidding and Needs your decision.
 * A project with no bids expires when live bidding ends. Any unawarded project
 * expires when the 24-hour selection window, or the 48-hour lifetime, ends.
 */
export function isOwnerListingClosed(
  project: WindowProject,
  activeBidCount: number,
  nowMs = Date.now(),
): boolean {
  if (project.selected_builder_id) return false;
  const status = project.status ?? '';
  if (status === 'cancelled' || status === 'expired' || status === 'completed') return true;

  const posted = millis(project.created_at);
  if (posted != null && posted + PROJECT_LIFETIME_MS <= nowMs) return true;

  const biddingEnds = millis(project.bidding_ends_at);
  const biddingEnded = biddingEnds != null && biddingEnds <= nowMs;
  if (!biddingEnded) return false;
  if (activeBidCount <= 0) return true;
  return selectionDeadlineMs(project) <= nowMs;
}

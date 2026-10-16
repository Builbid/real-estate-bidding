/** How long the owner can still select after live bidding closes. */
export const SELECTION_WINDOW_MS = 48 * 60 * 60 * 1000;

export const BIDDING_DURATION_HELPER =
  'You can select a worker/contractor at any time during live bidding or within the selection window.';

/** Review-step value: selection is open during bidding and for 48 hours after it closes. */
export const SELECTION_WINDOW_REVIEW =
  'During live bidding and for 48 hours after bids close';

/**
 * Rough client-side token estimate (~4 chars/token). Used only to
 * render an optimistic badge before the server's own estimate for
 * the same message arrives; always labelled "approx." in the UI.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

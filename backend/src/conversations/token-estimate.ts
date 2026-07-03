/**
 * Rough, approximate token estimate (~4 chars per token, the common
 * heuristic for English text). Good enough for a UI badge — not a
 * real tokenizer, and callers must label it as approximate.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

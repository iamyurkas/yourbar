export const WORD_SPLIT_RE = /[^a-z0-9\u0400-\u04FF]+/i;

export function wordPrefixMatch(tokens, queryTokens) {
  if (!Array.isArray(tokens) || !Array.isArray(queryTokens)) return false;
  if (queryTokens.length === 0) return false;
  let wi = 0;
  for (let i = 0; i < queryTokens.length; i++) {
    const part = queryTokens[i];
    while (wi < tokens.length && !tokens[wi].startsWith(part)) wi++;
    if (wi === tokens.length) return false;
    wi++;
  }
  return true;
}

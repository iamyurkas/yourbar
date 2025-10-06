const FNV_OFFSET = 2166136261 >>> 0;
const FNV_PRIME = 16777619;

function toNumber(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function hashString(hash: number, input: string): number {
  for (let idx = 0; idx < input.length; idx += 1) {
    hash ^= input.charCodeAt(idx);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

function normalizeList(iterable: Iterable<any> | null | undefined) {
  if (!iterable) return [];
  const arr = Array.from(iterable);
  return arr.sort((a, b) => toNumber(a?.id) - toNumber(b?.id));
}

/**
 * Builds a stable hash for the parts of ingredient records that influence
 * cocktail availability and matching logic.
 *
 * Fields intentionally excluded: values such as `inShoppingList` or
 * description/photo metadata. They do not change availability calculations
 * but previously still caused downstream selectors to recompute.
 */
export function makeIngredientAvailabilityKey(
  iterable: Iterable<any> | null | undefined
): number {
  const list = normalizeList(iterable);
  let hash = FNV_OFFSET;
  for (const ing of list) {
    const id = toNumber(ing?.id);
    const baseId = toNumber(ing?.baseIngredientId ?? ing?.id);
    const inBar = ing?.inBar ? 1 : 0;
    hash ^= id;
    hash = Math.imul(hash, FNV_PRIME);
    hash ^= baseId;
    hash = Math.imul(hash, FNV_PRIME);
    hash ^= inBar;
    hash = Math.imul(hash, FNV_PRIME);
    if (ing?.name) {
      hash = hashString(hash, String(ing.name));
    }
    if (ing?.searchName) {
      hash = hashString(hash, String(ing.searchName));
    }
  }
  return hash >>> 0;
}

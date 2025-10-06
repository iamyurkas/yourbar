export type IngredientDerivedState = {
  usageCount?: number;
  canMix?: boolean;
};

type DerivedMap = Map<string, IngredientDerivedState>;

const derivedCache: DerivedMap = new Map();

type DerivedListener = (
  id: string,
  flags: { inBar: boolean; inShopping: boolean },
  previous: IngredientDerivedState | undefined
) => IngredientDerivedState | void;

const listeners = new Set<DerivedListener>();

export function primeDerivedState(id: string, state: IngredientDerivedState) {
  derivedCache.set(id, { ...state });
}

export function getDerivedState(id: string): IngredientDerivedState | undefined {
  const entry = derivedCache.get(id);
  return entry ? { ...entry } : undefined;
}

export function registerDerivedUpdater(listener: DerivedListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateDerivedForToggle(
  id: string,
  flags: { inBar: boolean; inShopping: boolean }
) {
  const previous = derivedCache.get(id);
  let next = previous ? { ...previous } : {};
  for (const listener of listeners) {
    const maybe = listener(id, flags, previous);
    if (maybe) next = { ...next, ...maybe };
  }
  derivedCache.set(id, next);
  return next;
}


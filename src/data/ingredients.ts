import type { IngredientRecord } from "./types";

type IngredientModule = {
  getAllIngredients: (
    opts?: { limit?: number; offset?: number }
  ) => Promise<IngredientRecord[]>;
  getIngredientsByIds: (ids: number[]) => Promise<IngredientRecord[]>;
  getIngredientsByBaseIds: (
    baseIds: number[],
    opts?: { inBarOnly?: boolean }
  ) => Promise<IngredientRecord[]>;
  saveAllIngredients: (ingredients: any, tx?: any) => Promise<void>;
  addIngredient: (ingredient: any) => Promise<IngredientRecord>;
  saveIngredient: (ingredient: any) => Promise<IngredientRecord | void>;
  updateIngredientFields: (id: number, fields: Record<string, unknown>) => Promise<void>;
  flushPendingIngredients: (list: any[]) => Promise<void>;
  setIngredientsInShoppingList: (ids: number[], inShoppingList: boolean) => Promise<void>;
  toggleIngredientsInBar: (ids: number[]) => Promise<void>;
  deleteIngredient: (id: number) => Promise<void>;
  observeAllIngredients?: (
    callback: (records: IngredientRecord[]) => void
  ) => (() => void) | Promise<() => void>;
  observeIngredientById?: (
    id: number,
    callback: (record: IngredientRecord | null) => void
  ) => (() => void) | Promise<() => void>;
};

let backendPromise: Promise<IngredientModule> | null = null;

async function loadBackend(): Promise<IngredientModule> {
  if (!backendPromise) {
    backendPromise = (async () => {
      try {
        const realmModule = await import("./ingredients/realmStore");
        if (typeof realmModule.ensureRealm === "function") {
          await realmModule.ensureRealm();
        }
        return realmModule as unknown as IngredientModule;
      } catch (error) {
        console.warn(
          "[ingredients] Falling back to SQLite store because Realm failed to initialise",
          error
        );
        const sqliteModule = await import("./ingredients/sqliteStore");
        return sqliteModule as unknown as IngredientModule;
      }
    })();
  }
  return backendPromise;
}

export async function getAllIngredients(opts?: { limit?: number; offset?: number }) {
  return (await loadBackend()).getAllIngredients(opts);
}

export async function getIngredientsByIds(ids: number[]) {
  return (await loadBackend()).getIngredientsByIds(ids);
}

export async function getIngredientsByBaseIds(
  baseIds: number[],
  opts?: { inBarOnly?: boolean }
) {
  return (await loadBackend()).getIngredientsByBaseIds(baseIds, opts);
}

export async function saveAllIngredients(ingredients: any, tx?: any) {
  return (await loadBackend()).saveAllIngredients(ingredients, tx);
}

export async function addIngredient(ingredient: any) {
  return (await loadBackend()).addIngredient(ingredient);
}

export async function saveIngredient(updated: any) {
  return (await loadBackend()).saveIngredient(updated);
}

export async function updateIngredientFields(
  id: number,
  fields: Record<string, unknown>
) {
  return (await loadBackend()).updateIngredientFields(id, fields);
}

export async function flushPendingIngredients(list: any[]) {
  return (await loadBackend()).flushPendingIngredients(list);
}

export async function setIngredientsInShoppingList(ids: number[], inShoppingList: boolean) {
  return (await loadBackend()).setIngredientsInShoppingList(ids, inShoppingList);
}

export async function toggleIngredientsInBar(ids: number[]) {
  return (await loadBackend()).toggleIngredientsInBar(ids);
}

export async function deleteIngredient(id: number) {
  return (await loadBackend()).deleteIngredient(id);
}

export async function observeAllIngredients(
  callback: (records: IngredientRecord[]) => void
): Promise<() => void> {
  const backend = await loadBackend();
  if (backend.observeAllIngredients) {
    const disposer = backend.observeAllIngredients(callback);
    if (disposer instanceof Promise) {
      return await disposer;
    }
    return disposer;
  }
  const dispose = () => {};
  callback(await backend.getAllIngredients());
  return dispose;
}

export async function observeIngredientById(
  id: number,
  callback: (record: IngredientRecord | null) => void
): Promise<() => void> {
  const backend = await loadBackend();
  if (backend.observeIngredientById) {
    const disposer = backend.observeIngredientById(id, callback);
    if (disposer instanceof Promise) {
      return await disposer;
    }
    return disposer;
  }
  const [record] = await backend.getIngredientsByIds([id]);
  callback(record ?? null);
  return () => {};
}

export function buildIndex(list: IngredientRecord[]): Record<number, IngredientRecord> {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<number, IngredientRecord>);
}

export function updateIngredientById(map, updated) {
  const prev = map.get(updated.id);
  if (!prev) return map;
  const next = new Map(map);
  next.set(updated.id, { ...prev, ...updated });
  return next;
}

export function getIngredientById(id, index) {
  return index ? index[id] : null;
}

export function removeIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

export function __setBackend(mock: IngredientModule | null) {
  backendPromise = mock ? Promise.resolve(mock) : null;
}

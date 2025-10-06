import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import { sortByName } from "../utils/sortByName";
import * as LegacyIngredients from "./ingredients.legacy";
import storage from "./storage";
import { IngredientRecord } from "./types";

const STORAGE_KEY = "realm::ingredients::v1";

const now = () => Date.now();
const genId = () => now();

type IngredientMap = Map<number, IngredientRecord>;
type Listener = (items: IngredientRecord[]) => void;

interface MutationResult<T> {
  changed: boolean;
  value?: T;
}

type Mutation<T> = (
  draft: IngredientMap
) => MutationResult<T> | Promise<MutationResult<T>>;

const state: {
  ready: boolean;
  map: IngredientMap;
  listeners: Set<Listener>;
  cache: IngredientRecord[];
  dirty: boolean;
} = {
  ready: false,
  map: new Map(),
  listeners: new Set(),
  cache: [],
  dirty: true,
};

let ensurePromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function sanitizeIngredient(i: Partial<IngredientRecord>): IngredientRecord {
  const id = Number(i?.id ?? genId());
  const name = String(i?.name ?? "").trim();
  const searchName = normalizeSearch(name);
  const searchTokens = searchName.split(WORD_SPLIT_RE).filter(Boolean);
  return {
    id,
    name,
    description: i?.description ?? null,
    tags: Array.isArray(i?.tags) ? i.tags : [],
    baseIngredientId:
      i?.baseIngredientId != null ? Number(i.baseIngredientId) : null,
    usageCount: Number(i?.usageCount ?? 0),
    singleCocktailName: i?.singleCocktailName ?? null,
    searchName,
    searchTokens,
    photoUri: i?.photoUri ?? null,
    inBar: !!i?.inBar,
    inShoppingList: !!i?.inShoppingList,
  };
}

function mergeAndSanitize(
  prev: IngredientRecord | null,
  patch: Partial<IngredientRecord>
): IngredientRecord {
  const cleaned: Partial<IngredientRecord> = {};
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      (cleaned as any)[key] = value;
    }
  });
  const base = prev ? { ...prev } : {};
  return sanitizeIngredient({ ...base, ...cleaned });
}

function getSnapshot(): IngredientRecord[] {
  if (state.dirty) {
    state.cache = Array.from(state.map.values()).sort(sortByName);
    state.dirty = false;
  }
  return state.cache.slice();
}

function notifyListeners() {
  if (!state.listeners.size) return;
  const snapshot = getSnapshot();
  state.listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn("[ingredients] listener failed", error);
    }
  });
}

async function persistState() {
  const serialized = JSON.stringify(Array.from(state.map.values()));
  await storage.setItem(STORAGE_KEY, serialized);
}

let persistQueue: Promise<void> = Promise.resolve();

function queuePersist() {
  persistQueue = persistQueue
    .then(() => persistState())
    .catch((error) => {
      console.warn("[ingredients] persist failed", error);
    });
}

async function migrateFromLegacy(): Promise<IngredientRecord[] | null> {
  try {
    if (LegacyIngredients?.getAllIngredients) {
      const existing = await LegacyIngredients.getAllIngredients();
      if (Array.isArray(existing) && existing.length) {
        return existing.map((item) => sanitizeIngredient(item));
      }
    }
  } catch (error) {
    // ignore if sqlite is unavailable
  }
  return null;
}

async function ensureLoaded(): Promise<void> {
  if (state.ready) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        const serialized = await storage.getItem(STORAGE_KEY);
        if (serialized) {
          const parsed = JSON.parse(serialized);
          if (Array.isArray(parsed)) {
            parsed.forEach((raw) => {
              const item = sanitizeIngredient(raw);
              state.map.set(item.id, item);
            });
            state.dirty = true;
          }
        } else {
          const migrated = await migrateFromLegacy();
          if (migrated?.length) {
            migrated.forEach((item) => {
              state.map.set(item.id, item);
            });
            state.dirty = true;
            try {
              await persistState();
            } catch (error) {
              console.warn("[ingredients] persist failed", error);
            }
          }
        }
      } catch (error) {
        console.warn("[ingredients] failed to load", error);
        state.map.clear();
        state.dirty = true;
      }
      state.ready = true;
    })();
  }
  await ensurePromise;
}

async function runWrite<T>(mutation: Mutation<T>): Promise<T | undefined> {
  await ensureLoaded();
  const operation = writeQueue.then(async () => {
    const draft = new Map(state.map);
    const result = await mutation(draft);
    if (result.changed) {
      state.map = draft;
      state.dirty = true;
      notifyListeners();
      queuePersist();
    }
    return result.value;
  });
  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

function getListWithPagination(
  list: IngredientRecord[],
  {
    limit,
    offset,
  }: { limit?: number; offset?: number } = {}
): IngredientRecord[] {
  const start = typeof offset === "number" && offset > 0 ? offset : 0;
  if (typeof limit === "number" && limit >= 0) {
    return list.slice(start, start + limit);
  }
  if (start === 0) return list;
  return list.slice(start);
}

export async function getAllIngredients({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<IngredientRecord[]> {
  await ensureLoaded();
  const snapshot = getSnapshot();
  return getListWithPagination(snapshot, { limit, offset });
}

export async function observeAllIngredients(
  listener: Listener
): Promise<{ remove: () => void }> {
  await ensureLoaded();
  state.listeners.add(listener);
  listener(getSnapshot());
  return {
    remove() {
      state.listeners.delete(listener);
    },
  };
}

export async function getIngredientsByIds(
  ids: number[]
): Promise<IngredientRecord[]> {
  await ensureLoaded();
  const list = Array.isArray(ids) ? ids.filter((id) => id != null) : [];
  if (!list.length) return [];
  const result = list
    .map((id) => state.map.get(Number(id)))
    .filter((item): item is IngredientRecord => !!item);
  return result.sort(sortByName);
}

export async function getIngredientsByBaseIds(
  baseIds: number[],
  { inBarOnly = false }: { inBarOnly?: boolean } = {}
): Promise<IngredientRecord[]> {
  await ensureLoaded();
  const list = Array.isArray(baseIds) ? baseIds.filter((id) => id != null) : [];
  if (!list.length) return [];
  const targets = new Set(list.map((id) => Number(id)));
  const result: IngredientRecord[] = [];
  state.map.forEach((item) => {
    const baseId = item.baseIngredientId ?? item.id;
    if (!targets.has(baseId)) return;
    if (inBarOnly && !item.inBar) return;
    result.push(item);
  });
  return result.sort(sortByName);
}

export async function saveAllIngredients(
  ingredients,
  _tx?
): Promise<void> {
  const list = Array.isArray(ingredients) ? ingredients : [];
  const sanitized = list.map((item) => mergeAndSanitize(null, item));
  await runWrite<void>((draft) => {
    draft.clear();
    sanitized.forEach((item) => {
      draft.set(item.id, item);
    });
    return { changed: true };
  });
}

export async function addIngredient(ingredient) {
  const item = mergeAndSanitize(null, {
    ...ingredient,
    id: ingredient?.id ?? genId(),
  });
  await runWrite<IngredientRecord>((draft) => {
    draft.set(item.id, item);
    return { changed: true, value: item };
  });
  return item;
}

export async function saveIngredient(updated) {
  if (!updated?.id) return;
  const numericId = Number(updated.id);
  const sanitized = await runWrite<IngredientRecord | undefined>((draft) => {
    const prev = draft.get(numericId) ?? null;
    const next = mergeAndSanitize(prev, { ...updated, id: numericId });
    draft.set(next.id, next);
    return { changed: true, value: next };
  });
  return sanitized ?? undefined;
}

export async function updateIngredientFields(id, fields) {
  if (!id || !fields || typeof fields !== "object") return;
  const numericId = Number(id);
  await runWrite<void>((draft) => {
    const prev = draft.get(numericId);
    if (!prev) return { changed: false };
    const sanitized = mergeAndSanitize(prev, {
      ...fields,
      id: numericId,
    });
    draft.set(numericId, sanitized);
    return { changed: true };
  });
}

export async function flushPendingIngredients(list) {
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return;
  await runWrite<void>((draft) => {
    items.forEach((item) => {
      const numericId = Number(item?.id);
      const prev = draft.get(numericId) ?? null;
      const sanitized = mergeAndSanitize(prev, item);
      draft.set(sanitized.id, sanitized);
    });
    return { changed: true };
  });
}

export async function setIngredientsInShoppingList(ids, inShoppingList) {
  const list = Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id) => id != null)))
    : [];
  if (!list.length) return;
  const value = !!inShoppingList;
  await runWrite<void>((draft) => {
    let changed = false;
    list.forEach((id) => {
      const numericId = Number(id);
      const prev = draft.get(numericId);
      if (prev && prev.inShoppingList !== value) {
        draft.set(numericId, { ...prev, inShoppingList: value });
        changed = true;
      }
    });
    return { changed };
  });
}

export async function toggleIngredientsInBar(ids) {
  const list = Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id) => id != null)))
    : [];
  if (!list.length) return;
  await runWrite<void>((draft) => {
    let changed = false;
    list.forEach((id) => {
      const numericId = Number(id);
      const prev = draft.get(numericId);
      if (prev) {
        draft.set(numericId, { ...prev, inBar: !prev.inBar });
        changed = true;
      }
    });
    return { changed };
  });
}

export async function deleteIngredient(id) {
  if (id == null) return;
  const numericId = Number(id);
  await runWrite<void>((draft) => {
    if (!draft.has(numericId)) return { changed: false };
    draft.delete(numericId);
    return { changed: true };
  });
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

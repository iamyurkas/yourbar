import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import { sortByName } from "../utils/sortByName";
import { IngredientRecord } from "./types";

declare const require: any;

const DATA = require("../../assets/data/data.json") as any;

type RawIngredient = {
  id: number;
  name: string;
  description?: string | null;
  tags?: any[];
  baseIngredientId?: number | null;
  usageCount?: number;
  singleCocktailName?: string | null;
  searchName?: string;
  searchTokens?: string[];
  photoUri?: string | null;
};

let ingredientCache: IngredientRecord[] | null = null;
let ingredientMap: Map<number, IngredientRecord> | null = null;

function sanitizeIngredient(raw: RawIngredient): IngredientRecord {
  const id = Number(raw?.id ?? 0);
  const name = String(raw?.name ?? "").trim();
  const searchName = normalizeSearch(raw?.searchName ?? name);
  const searchTokens = Array.isArray(raw?.searchTokens)
    ? raw.searchTokens.map((token) => String(token))
    : searchName.split(WORD_SPLIT_RE).filter(Boolean);
  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((tag) =>
        typeof tag === "object" && tag !== null ? { ...tag } : tag
      )
    : [];
  return {
    id,
    name,
    description:
      raw?.description != null ? String(raw.description) : null,
    tags,
    baseIngredientId:
      raw?.baseIngredientId != null ? Number(raw.baseIngredientId) : null,
    usageCount: Number(raw?.usageCount ?? 0),
    singleCocktailName:
      raw?.singleCocktailName != null ? String(raw.singleCocktailName) : null,
    searchName,
    searchTokens,
    photoUri: raw?.photoUri != null ? String(raw.photoUri) : null,
    inBar: false,
    inShoppingList: false,
  };
}

function ensureIngredients(): IngredientRecord[] {
  if (!ingredientCache) {
    const rawList: RawIngredient[] = Array.isArray(DATA?.ingredients)
      ? DATA.ingredients
      : [];
    ingredientCache = rawList.map(sanitizeIngredient).sort(sortByName);
    ingredientMap = new Map(ingredientCache.map((item) => [item.id, item]));
  }
  return ingredientCache;
}

function cloneIngredient(item: IngredientRecord): IngredientRecord {
  return {
    ...item,
    tags: Array.isArray(item.tags)
      ? item.tags.map((tag: any) =>
          typeof tag === "object" && tag !== null ? { ...tag } : tag
        )
      : [],
    searchTokens: [...item.searchTokens],
  };
}

export async function getAllIngredients({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<IngredientRecord[]> {
  const list = ensureIngredients();
  let items = list;
  if (typeof offset === "number") {
    items = items.slice(offset);
  }
  if (typeof limit === "number") {
    items = items.slice(0, limit);
  }
  return items.map(cloneIngredient);
}

export async function getIngredientsByIds(
  ids: number[]
): Promise<IngredientRecord[]> {
  ensureIngredients();
  const uniqueIds = Array.isArray(ids)
    ? Array.from(new Set(ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id))))
    : [];
  if (uniqueIds.length === 0) return [];
  const list = uniqueIds
    .map((id) => ingredientMap?.get(id))
    .filter(Boolean) as IngredientRecord[];
  return list.map(cloneIngredient).sort(sortByName);
}

export async function getIngredientsByBaseIds(
  baseIds: number[],
  { inBarOnly = false }: { inBarOnly?: boolean } = {}
): Promise<IngredientRecord[]> {
  ensureIngredients();
  const uniqueIds = Array.isArray(baseIds)
    ? Array.from(new Set(baseIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))))
    : [];
  if (uniqueIds.length === 0) return [];
  const list = ensureIngredients().filter((item) =>
    item.baseIngredientId != null && uniqueIds.includes(item.baseIngredientId)
  );
  const filtered = inBarOnly
    ? list.filter((item) => item.inBar)
    : list;
  return filtered.map(cloneIngredient).sort(sortByName);
}

export function buildIndex(list: IngredientRecord[]): Record<number, IngredientRecord> {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<number, IngredientRecord>);
}

export async function saveAllIngredients(
  _ingredients?: IngredientRecord[],
  _tx?: any
): Promise<void> {
  // No-op – storage has been removed.
}

export async function addIngredient(
  ingredient: Partial<IngredientRecord>
): Promise<IngredientRecord> {
  return sanitizeIngredient(ingredient as RawIngredient);
}

export async function saveIngredient(
  updated: Partial<IngredientRecord>
): Promise<IngredientRecord> {
  return sanitizeIngredient(updated as RawIngredient);
}

export async function updateIngredientFields(
  _id?: number,
  _fields?: Record<string, unknown>
): Promise<void> {
  // No-op – storage has been removed.
}

export async function flushPendingIngredients(
  _list?: Partial<IngredientRecord>[]
): Promise<void> {
  // No-op – storage has been removed.
}

export async function setIngredientsInShoppingList(
  _ids?: number[],
  _inShoppingList?: boolean
): Promise<void> {
  // No-op – storage has been removed.
}

export async function toggleIngredientsInBar(
  _ids?: number[]
): Promise<void> {
  // No-op – storage has been removed.
}

export function getIngredientById(id: number, index: Record<number, IngredientRecord>) {
  return index ? index[id] : null;
}

export async function deleteIngredient(_id?: number): Promise<void> {
  // No-op – storage has been removed.
}

export function updateIngredientById(map, updated) {
  const prev = map.get(updated.id);
  if (!prev) return map;
  const next = new Map(map);
  next.set(updated.id, { ...prev, ...updated });
  return next;
}

export function removeIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

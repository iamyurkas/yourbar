import * as FileSystem from "expo-file-system";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import { sortByName } from "../utils/sortByName";

export interface InventoryIngredient {
  id: number;
  name: string;
  description: string | null;
  photoUri: string | null;
  baseIngredientId: number | null;
  tags: any[];
  searchNameNormalized: string;
  searchTokens: string[];
}

export interface InventoryCocktail {
  id: number;
  name: string;
  description?: string | null;
  ingredients?: any[];
  [key: string]: any;
}

export interface InventorySnapshot {
  version: number;
  ingredients: InventoryIngredient[];
  cocktails: InventoryCocktail[];
  availableIngredientIds: number[];
  shoppingListIngredientIds: number[];
  cocktailRatings: Record<string, number>;
}

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_FILE = "inventory-state.json";

let ingredients: InventoryIngredient[] = [];
let cocktails: InventoryCocktail[] = [];
let availableIngredientIds = new Set<number>();
let shoppingListIngredientIds = new Set<number>();
let cocktailRatings: Record<string, number> = {};
let lastPersistedSnapshot: string | null = null;

const now = () => Date.now();

function getSnapshotPath(): string | null {
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!dir) return null;
  return `${dir}${SNAPSHOT_FILE}`;
}

function normalizeId(value: any): number {
  const direct = Number(value);
  if (!Number.isNaN(direct) && direct > 0) return direct;
  const parts = String(value ?? "").split("-");
  const last = Number(parts[parts.length - 1]);
  if (!Number.isNaN(last) && last > 0) return last;
  return now();
}

function normalizeIngredientFields(input: Partial<InventoryIngredient>): InventoryIngredient {
  const id = normalizeId(input?.id);
  const name = String(input?.name ?? "").trim();
  const rawDescription =
    input?.description != null ? String(input.description).trim() : null;
  const description = rawDescription ? rawDescription : null;
  const photoUri = input?.photoUri ? String(input.photoUri).trim() : null;
  const baseValue = input?.baseIngredientId;
  const baseIngredientId =
    baseValue != null && !Number.isNaN(Number(baseValue))
      ? Number(baseValue)
      : null;
  const searchNameNormalized = normalizeSearch(name);
  const searchTokens = searchNameNormalized.split(WORD_SPLIT_RE).filter(Boolean);
  const tags = Array.isArray(input?.tags) ? input.tags.filter((t) => t != null) : [];
  return {
    id,
    name,
    description,
    photoUri,
    baseIngredientId,
    tags,
    searchNameNormalized,
    searchTokens,
  };
}

function normalizeCocktailFields(input: InventoryCocktail): InventoryCocktail {
  if (!input) return { id: now(), name: "" };
  const id = normalizeId(input.id);
  const name = String(input.name ?? "").trim();
  const description = input.description != null ? String(input.description).trim() : null;
  const normalized: InventoryCocktail = {
    ...input,
    id,
    name,
    description,
  };
  return normalized;
}

function sortIngredients(list: InventoryIngredient[]): InventoryIngredient[] {
  return [...list].sort((a, b) => {
    if (a.searchNameNormalized === b.searchNameNormalized) {
      return sortByName(a as any, b as any);
    }
    return a.searchNameNormalized.localeCompare(b.searchNameNormalized);
  });
}

function buildSnapshot(): InventorySnapshot {
  return {
    version: SNAPSHOT_VERSION,
    ingredients,
    cocktails,
    availableIngredientIds: Array.from(availableIngredientIds),
    shoppingListIngredientIds: Array.from(shoppingListIngredientIds),
    cocktailRatings: { ...cocktailRatings },
  };
}

function applySnapshot(snapshot: InventorySnapshot) {
  ingredients = sortIngredients(snapshot.ingredients || []);
  cocktails = Array.isArray(snapshot.cocktails) ? snapshot.cocktails.map(normalizeCocktailFields) : [];
  availableIngredientIds = new Set(snapshot.availableIngredientIds || []);
  shoppingListIngredientIds = new Set(snapshot.shoppingListIngredientIds || []);
  cocktailRatings = snapshot.cocktailRatings ? { ...snapshot.cocktailRatings } : {};
}

async function persistInventorySnapshot(snapshot: InventorySnapshot = buildSnapshot()) {
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastPersistedSnapshot) return;
  const path = getSnapshotPath();
  if (!path) return;
  try {
    await FileSystem.writeAsStringAsync(path, serialized, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    lastPersistedSnapshot = serialized;
  } catch (error) {
    console.warn("persistInventorySnapshot failed", error);
  }
}

async function readSnapshotFromDisk(): Promise<InventorySnapshot | null> {
  const path = getSnapshotPath();
  if (!path) return null;
  try {
    const info = await FileSystem.getInfoAsync(path, { size: true });
    if (!info.exists) return null;
    const contents = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(contents);
    return parsed;
  } catch (error) {
    console.warn("Failed to read inventory snapshot", error);
    return null;
  }
}

async function importDefaultBundle(): Promise<InventorySnapshot> {
  // @ts-ignore - JSON import without module declaration
  const raw = await import("../../assets/data/data.json");
  const payload = (raw?.default || raw) as any;
  const normalizedIngredients: InventoryIngredient[] = Array.isArray(payload?.ingredients)
    ? payload.ingredients.map((it: any) => normalizeIngredientFields({
        ...it,
        description: it?.description ?? null,
        photoUri: it?.photoUri || it?.image || null,
        baseIngredientId: it?.baseIngredientId ?? null,
        tags: it?.tags,
      }))
    : [];
  const normalizedCocktails: InventoryCocktail[] = Array.isArray(payload?.cocktails)
    ? payload.cocktails.map((c: any) => normalizeCocktailFields({
        ...c,
        photoUri: c?.photoUri || c?.image || null,
      }))
    : [];
  const snapshot: InventorySnapshot = {
    version: SNAPSHOT_VERSION,
    ingredients: sortIngredients(normalizedIngredients),
    cocktails: normalizedCocktails,
    availableIngredientIds: [],
    shoppingListIngredientIds: [],
    cocktailRatings: {},
  };
  applySnapshot(snapshot);
  lastPersistedSnapshot = null;
  await persistInventorySnapshot(snapshot);
  return snapshot;
}

export async function loadInventoryState(): Promise<InventorySnapshot> {
  const snapshot = await readSnapshotFromDisk();
  if (snapshot?.version === SNAPSHOT_VERSION) {
    applySnapshot(snapshot);
    lastPersistedSnapshot = JSON.stringify(buildSnapshot());
    return buildSnapshot();
  }
  return importDefaultBundle();
}

export function getInventoryState(): InventorySnapshot {
  return buildSnapshot();
}

export async function createIngredient(input: Partial<InventoryIngredient>): Promise<InventoryIngredient> {
  const normalized = normalizeIngredientFields(input);
  if (ingredients.some((i) => i.id === normalized.id)) {
    normalized.id = now();
  }
  ingredients = sortIngredients([...ingredients, normalized]);
  availableIngredientIds.add(normalized.id);
  shoppingListIngredientIds.delete(normalized.id);
  await persistInventorySnapshot();
  return normalized;
}

export async function updateIngredient(
  id: number,
  updates: Partial<InventoryIngredient>
): Promise<InventoryIngredient | null> {
  const current = ingredients.find((i) => i.id === id);
  if (!current) return null;
  const normalized = normalizeIngredientFields({ ...current, ...updates, id });
  ingredients = sortIngredients(ingredients.map((i) => (i.id === id ? normalized : i)));
  await persistInventorySnapshot();
  return normalized;
}

export async function deleteIngredient(id: number): Promise<void> {
  const prevLen = ingredients.length;
  ingredients = ingredients.filter((i) => i.id !== id);
  if (ingredients.length !== prevLen) {
    ingredients = ingredients.map((i) =>
      i.baseIngredientId === id ? { ...i, baseIngredientId: null } : i
    );
    availableIngredientIds.delete(id);
    shoppingListIngredientIds.delete(id);
    await persistInventorySnapshot();
  }
}

export async function setIngredientAvailability(id: number, available: boolean): Promise<void> {
  if (available) {
    availableIngredientIds.add(id);
    shoppingListIngredientIds.delete(id);
  } else {
    availableIngredientIds.delete(id);
  }
  await persistInventorySnapshot();
}

export async function toggleIngredientAvailability(id: number): Promise<boolean> {
  const next = !availableIngredientIds.has(id);
  await setIngredientAvailability(id, next);
  return next;
}

export async function toggleIngredientShopping(id: number): Promise<boolean> {
  if (shoppingListIngredientIds.has(id)) {
    shoppingListIngredientIds.delete(id);
  } else {
    shoppingListIngredientIds.add(id);
  }
  await persistInventorySnapshot();
  return shoppingListIngredientIds.has(id);
}

function ratingKey(cocktail: { id?: number; name?: string }): string | null {
  if (!cocktail) return null;
  if (cocktail.id != null) return String(cocktail.id);
  if (cocktail.name) return String(cocktail.name).toLowerCase();
  return null;
}

export async function setCocktailRating(
  cocktail: { id?: number; name?: string },
  rating: number
): Promise<number | null> {
  const key = ratingKey(cocktail);
  if (!key) return null;
  const clamped = Math.min(5, Math.max(0, Number(rating) || 0));
  cocktailRatings[key] = clamped;
  await persistInventorySnapshot();
  return clamped;
}

export function getCocktailRating(cocktail: { id?: number; name?: string }): number {
  const key = ratingKey(cocktail);
  if (!key) return 0;
  return cocktailRatings[key] ?? 0;
}

export function cocktailsWithRatings(list: InventoryCocktail[]): InventoryCocktail[] {
  return Array.isArray(list)
    ? list.map((c) => ({ ...c, userRating: getCocktailRating(c) }))
    : [];
}

export function getAvailableIngredientIds(): Set<number> {
  return new Set(availableIngredientIds);
}

export function getShoppingListIngredientIds(): Set<number> {
  return new Set(shoppingListIngredientIds);
}

export { persistInventorySnapshot };

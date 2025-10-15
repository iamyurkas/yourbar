import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import { sortByName } from "../utils/sortByName";
import { CocktailRecord } from "./types";

declare const require: any;

const DATA = require("../../assets/data/data.json") as any;

type RawCocktail = {
  id: number;
  name: string;
  description?: string | null;
  tags?: any[];
  ingredients?: any[];
  glassId?: number | null;
  rating?: number;
  instructions?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
  photoUri?: string | null;
  garnish?: string | null;
};

type RawCocktailIngredient = {
  order?: number;
  ingredientId?: number | null;
  name?: string | null;
  amount?: string | null;
  unitId?: number | null;
  garnish?: boolean;
  optional?: boolean;
  allowBaseSubstitution?: boolean;
  allowBrandedSubstitutes?: boolean;
  substitutes?: any[];
};

let cocktailCache: CocktailRecord[] | null = null;
let cocktailMap: Map<number, CocktailRecord> | null = null;

function sanitizeCocktailIngredient(raw: RawCocktailIngredient, index: number) {
  const substitutes = Array.isArray(raw?.substitutes)
    ? raw.substitutes.map((s) => ({ ...s }))
    : [];
  return {
    order: Number(raw?.order ?? index + 1),
    ingredientId:
      raw?.ingredientId != null ? Number(raw.ingredientId) : null,
    name: raw?.name != null ? String(raw.name) : null,
    amount: raw?.amount != null ? String(raw.amount) : null,
    unitId: raw?.unitId != null ? Number(raw.unitId) : null,
    garnish: !!raw?.garnish,
    optional: !!raw?.optional,
    allowBaseSubstitution: !!raw?.allowBaseSubstitution,
    allowBrandedSubstitutes: !!raw?.allowBrandedSubstitutes,
    substitutes,
  };
}

function sanitizeCocktail(raw: RawCocktail): CocktailRecord {
  const id = Number(raw?.id ?? 0);
  const name = String(raw?.name ?? "").trim();
  const searchName = normalizeSearch(name);
  const searchTokens = searchName.split(WORD_SPLIT_RE).filter(Boolean);
  const ingredients = Array.isArray(raw?.ingredients)
    ? raw.ingredients.map(sanitizeCocktailIngredient)
    : [];
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
    ingredients,
    glassId: raw?.glassId != null ? Number(raw.glassId) : null,
    rating: Number(raw?.rating ?? 0),
    instructions:
      raw?.instructions != null ? String(raw.instructions) : null,
    createdAt: raw?.createdAt != null ? Number(raw.createdAt) : null,
    updatedAt: raw?.updatedAt != null ? Number(raw.updatedAt) : null,
    searchName,
    searchTokens,
    photoUri: raw?.photoUri != null ? String(raw.photoUri) : null,
    garnish: raw?.garnish != null ? String(raw.garnish) : null,
  };
}

function ensureCocktails(): CocktailRecord[] {
  if (!cocktailCache) {
    const rawList: RawCocktail[] = Array.isArray(DATA?.cocktails)
      ? DATA.cocktails
      : [];
    cocktailCache = rawList.map(sanitizeCocktail).sort(sortByName);
    cocktailMap = new Map(cocktailCache.map((c) => [c.id, c]));
  }
  return cocktailCache;
}

function cloneCocktail(item: CocktailRecord): CocktailRecord {
  return {
    ...item,
    tags: Array.isArray(item.tags)
      ? item.tags.map((tag: any) =>
          typeof tag === "object" && tag !== null ? { ...tag } : tag
        )
      : [],
    ingredients: Array.isArray(item.ingredients)
      ? item.ingredients.map((ing) => ({
          ...ing,
          substitutes: Array.isArray(ing?.substitutes)
            ? ing.substitutes.map((s) => ({ ...s }))
            : [],
        }))
      : [],
    searchTokens: [...item.searchTokens],
  };
}

export async function getAllCocktails(): Promise<CocktailRecord[]> {
  const list = ensureCocktails();
  return list.map(cloneCocktail);
}

export async function getCocktailById(
  id: number
): Promise<CocktailRecord | null> {
  ensureCocktails();
  const found = cocktailMap?.get(Number(id));
  return found ? cloneCocktail(found) : null;
}

export async function addCocktail(
  cocktail: CocktailRecord
): Promise<CocktailRecord> {
  return sanitizeCocktail(cocktail as any);
}

export async function saveCocktail(
  updated: CocktailRecord
): Promise<CocktailRecord> {
  return sanitizeCocktail(updated as any);
}

export async function deleteCocktail(_id?: number): Promise<void> {
  // No-op – storage has been removed.
}

export async function replaceAllCocktails(
  cocktails: CocktailRecord[],
  _tx?: any
): Promise<CocktailRecord[]> {
  return Array.isArray(cocktails)
    ? cocktails.map((item) => sanitizeCocktail(item as any))
    : [];
}

export async function searchCocktails(
  query: string
): Promise<CocktailRecord[]> {
  const list = ensureCocktails();
  const q = normalizeSearch(String(query || "").trim());
  if (!q) return list.map(cloneCocktail);
  return list
    .filter((c) => c.searchName.includes(q))
    .map(cloneCocktail);
}

export function updateCocktailById(
  list: CocktailRecord[],
  updated: CocktailRecord
): CocktailRecord[] {
  const index = list.findIndex((c) => c.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export function removeCocktail(
  list: CocktailRecord[],
  id: number
): CocktailRecord[] {
  return list.filter((item) => item.id !== id);
}

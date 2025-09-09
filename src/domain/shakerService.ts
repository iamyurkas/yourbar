import { normalizeSearch } from "../utils/normalizeSearch";
import type {
  Ingredient,
  IngredientTag,
  ShakerListItem,
  Cocktail,
} from "../types/models";

// cache for normalizeSearch results
const searchNormalizeCache = new Map<string, string>();

// cache for maps filtered by stock and search
let inBarCache:
  | { src: Map<number, Ingredient[]>; map: Map<number, Ingredient[]> }
  | undefined;
const searchMapCache = new Map<string, Map<number, Ingredient[]>>();

// memoization cache for final list
const listCache = new Map<string, ShakerListItem[]>();

let lastIngredientsByTag: Map<number, Ingredient[]> | undefined;

function getNormalizedSearch(s: string): string {
  const cached = searchNormalizeCache.get(s);
  if (cached != null) return cached;
  const norm = normalizeSearch(s);
  searchNormalizeCache.set(s, norm);
  return norm;
}

function getInBarMap(
  ingredientsByTag: Map<number, Ingredient[]>
): Map<number, Ingredient[]> {
  if (inBarCache && inBarCache.src === ingredientsByTag) return inBarCache.map;
  const map = new Map<number, Ingredient[]>();
  ingredientsByTag.forEach((items, id) => {
    const filtered = items.filter((i) => i.inBar);
    if (filtered.length) map.set(id, filtered);
  });
  inBarCache = { src: ingredientsByTag, map };
  return map;
}

function getSearchMap(
  base: Map<number, Ingredient[]>,
  q: string,
  stockKey: string
): Map<number, Ingredient[]> {
  const key = `${stockKey}|${q}`;
  const cached = searchMapCache.get(key);
  if (cached) return cached;
  const map = new Map<number, Ingredient[]>();
  base.forEach((items, id) => {
    const filtered = items.filter((i) => i.searchName.includes(q));
    if (filtered.length) map.set(id, filtered);
  });
  searchMapCache.set(key, map);
  return map;
}

function expandedKey(expanded: Record<number, boolean>): string {
  return Object.keys(expanded)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => `${k}:${expanded[Number(k)] ? 1 : 0}`)
    .join(",");
}

export function buildShakerListData({
  ingredientTags,
  ingredientsByTag,
  search,
  inStockOnly,
  expanded,
}: {
  ingredientTags: IngredientTag[];
  ingredientsByTag: Map<number, Ingredient[]>;
  search: string;
  inStockOnly: boolean;
  expanded: Record<number, boolean>;
}): ShakerListItem[] {
  if (lastIngredientsByTag !== ingredientsByTag) {
    // underlying data changed – clear caches dependent on ingredients
    searchMapCache.clear();
    listCache.clear();
    inBarCache = undefined;
    lastIngredientsByTag = ingredientsByTag;
  }

  const q = getNormalizedSearch(search);
  const base = inStockOnly ? getInBarMap(ingredientsByTag) : ingredientsByTag;
  const filtered = q ? getSearchMap(base, q, inStockOnly ? "1" : "0") : base;

  const memoKey = `${q}|${inStockOnly ? 1 : 0}|${expandedKey(expanded)}`;
  const memo = listCache.get(memoKey);
  if (memo) return memo;

  const arr: ShakerListItem[] = [];
  ingredientTags.forEach((tag) => {
    const items = filtered.get(tag.id) || [];
    if (items.length === 0) return;
    arr.push({ type: "TAG", tag });
    if (expanded[tag.id]) {
      items.forEach((ing, idx) => {
        arr.push({
          type: "ING",
          ingredient: ing,
          isLast: idx === items.length - 1,
        });
      });
    }
  });

  listCache.set(memoKey, arr);
  return arr;
}

export function computeRecipeMatches({
  selectedIds,
  ingredientsByTag,
  usageMap,
}: {
  selectedIds: number[];
  ingredientsByTag: Map<number, Ingredient[]>;
  usageMap: Record<number, number[]>;
}): { recipesCount: number; recipeIds: number[] } {
  if (selectedIds.length === 0) return { recipesCount: 0, recipeIds: [] };

  const groups = new Map<number, number[]>();
  ingredientsByTag.forEach((items, tagId) => {
    const selected = items
      .filter((ing) => selectedIds.includes(ing.id))
      .map((ing) => ing.id);
    if (selected.length > 0) groups.set(tagId, selected);
  });

  if (groups.size === 0) return { recipesCount: 0, recipeIds: [] };

  let intersection: Set<number> | undefined;
  groups.forEach((ids) => {
    const union = new Set<number>();
    ids.forEach((id) => {
      (usageMap[id] || []).forEach((cid) => union.add(cid));
    });
    if (!intersection) {
      intersection = union;
    } else {
      intersection = new Set(
        [...intersection].filter((cid) => union.has(cid))
      );
    }
  });

  const result = intersection ? [...intersection] : [];
  return { recipesCount: result.length, recipeIds: result };
}

export function computeAvailableCocktails({
  recipeIds,
  cocktails,
  ingredients,
  allowSubstitutes,
  ignoreGarnish,
}: {
  recipeIds: number[];
  cocktails: Cocktail[];
  ingredients: Ingredient[];
  allowSubstitutes: boolean;
  ignoreGarnish: boolean;
}): { availableCount: number; availableCocktailIds: number[] } {
  if (recipeIds.length === 0)
    return { availableCount: 0, availableCocktailIds: [] };

  const ingMap = new Map(ingredients.map((i) => [String(i.id), i]));
  const findBrand = (baseId: string) =>
    ingredients.find(
      (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
    );

  const isSatisfied = (r: any): boolean => {
    const ing = ingMap.get(String(r.ingredientId));
    if (ing?.inBar) return true;
    const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
    if (allowSubstitutes || r.allowBaseSubstitution) {
      const base = ingMap.get(baseId);
      if (base?.inBar) return true;
    }
    const isBaseIngredient = ing?.baseIngredientId == null;
    if (allowSubstitutes || r.allowBrandedSubstitutes || isBaseIngredient) {
      const brand = findBrand(baseId);
      if (brand) return true;
    }
    if (Array.isArray(r.substitutes)) {
      for (const s of r.substitutes) {
        const candidate = ingMap.get(String(s.id));
        if (candidate?.inBar) return true;
      }
    }
    return false;
  };

  const ids: number[] = [];
  cocktails.forEach((c) => {
    if (!recipeIds.includes(c.id)) return;
    const required = (c.ingredients || []).filter(
      (r: any) => !r.optional && !(ignoreGarnish && r.garnish)
    );
    if (required.length === 0) return;
    for (const r of required) {
      if (!isSatisfied(r)) return;
    }
    ids.push(c.id);
  });

  return { availableCount: ids.length, availableCocktailIds: ids };
}

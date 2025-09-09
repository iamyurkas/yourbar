import { normalizeSearch } from "../utils/normalizeSearch";
import type {
  Ingredient,
  IngredientTag,
  ShakerListItem,
  Cocktail,
} from "../types/models";

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
  const q = normalizeSearch(search);
  const filtered = new Map<number, Ingredient[]>();

  ingredientsByTag.forEach((items, id) => {
    const bySearch = q ? items.filter((i) => i.searchName.includes(q)) : items;
    const byStock = inStockOnly ? bySearch.filter((i) => i.inBar) : bySearch;
    if (byStock.length) filtered.set(id, byStock);
  });

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

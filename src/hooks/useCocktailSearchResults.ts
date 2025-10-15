import { useMemo, useRef } from "react";
import { buildIngredientIndex, getCocktailIngredientInfo } from "../domain/cocktailIngredients";
import { normalizeSearch } from "../utils/normalizeSearch";
import { sortByName } from "../utils/sortByName";

interface Options {
  cocktails?: any[];
  ingredients?: any[];
  search?: string;
  selectedTagIds?: number[];
  allowSubstitutes?: boolean;
  ignoreGarnish?: boolean;
  filter?: (cocktail: any) => boolean;
}

interface CacheEntry {
  base: any;
  ingredientsRef: any[] | undefined;
  indexRef: {
    ingMap: Map<string, any>;
    byBase: Map<string, any[]>;
  } | null;
  allowSubstitutes: boolean;
  ignoreGarnish: boolean;
  meta: {
    name: string | undefined;
    photoUri: string | undefined;
    glassId: number | string | undefined;
    tagsRef: any;
  };
}

export default function useCocktailSearchResults({
  cocktails = [],
  ingredients = [],
  search = "",
  selectedTagIds = [],
  allowSubstitutes = false,
  ignoreGarnish = false,
  filter,
}: Options) {
  const cacheRef = useRef<Map<number, CacheEntry>>(new Map());
  const normalizedSearch = useMemo(() => normalizeSearch(search || ""), [search]);
  const ingredientIndex = useMemo(() => buildIngredientIndex(ingredients || []), [ingredients]);

  return useMemo(() => {
    const cache = cacheRef.current;
    const nextCache = new Map<number, CacheEntry>();

    const results = (cocktails || [])
      .filter((cocktail) => {
        if (typeof filter === "function" && !filter(cocktail)) return false;
        if (selectedTagIds.length > 0) {
          if (
            !Array.isArray(cocktail.tags) ||
            !cocktail.tags.some((t: any) => selectedTagIds.includes(t.id))
          ) {
            return false;
          }
        }
        if (!normalizedSearch) return true;
        const name =
          cocktail.searchName || normalizeSearch(String(cocktail.name || ""));
        return name.includes(normalizedSearch);
      })
      .map((cocktail) => {
        const cached = cache.get(cocktail.id);
        const meta = {
          name: cocktail.name,
          photoUri: cocktail.photoUri,
          glassId: cocktail.glassId,
          tagsRef: cocktail.tags,
        };
        const shouldReuse =
          cached &&
          cached.ingredientsRef === cocktail.ingredients &&
          cached.indexRef?.ingMap === ingredientIndex.ingMap &&
          cached.indexRef?.byBase === ingredientIndex.byBase &&
          cached.allowSubstitutes === allowSubstitutes &&
          cached.ignoreGarnish === ignoreGarnish &&
          cached.meta.name === meta.name &&
          cached.meta.photoUri === meta.photoUri &&
          cached.meta.glassId === meta.glassId &&
          cached.meta.tagsRef === meta.tagsRef;

        if (shouldReuse) {
          let base = cached.base;
          if (base.rating !== cocktail.rating) {
            base = { ...base, rating: cocktail.rating };
          }
          if (base.favorite !== cocktail.favorite) {
            base = { ...base, favorite: cocktail.favorite };
          }
          if (base.photoUri !== cocktail.photoUri || base.name !== cocktail.name) {
            base = { ...base, name: cocktail.name, photoUri: cocktail.photoUri };
          }
          nextCache.set(cocktail.id, { ...cached, base, meta });
          return base;
        }

        const details = getCocktailIngredientInfo(cocktail, {
          ingMap: ingredientIndex.ingMap,
          findBrand: ingredientIndex.findBrand,
          allowSubstitutes,
          ignoreGarnish,
        });
        const base = { ...cocktail, ...details };
        nextCache.set(cocktail.id, {
          base,
          ingredientsRef: cocktail.ingredients,
          indexRef: {
            ingMap: ingredientIndex.ingMap,
            byBase: ingredientIndex.byBase,
          },
          allowSubstitutes,
          ignoreGarnish,
          meta,
        });
        return base;
      });

    cacheRef.current = nextCache;
    return results.sort(sortByName);
  }, [
    allowSubstitutes,
    cocktails,
    filter,
    ignoreGarnish,
    ingredientIndex,
    normalizedSearch,
    selectedTagIds,
  ]);
}

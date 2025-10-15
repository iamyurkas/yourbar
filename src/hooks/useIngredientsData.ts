import { useCallback, useContext, useEffect } from "react";
import { getAllIngredients } from "../domain/ingredients";
import { getAllCocktails } from "../domain/cocktails";
import { mapCocktailsByIngredient } from "../domain/ingredientUsage";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import IngredientUsageContext from "../context/IngredientUsageContext";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../data/settings";
import { getAllTags } from "../data/ingredientTags";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";

export default function useIngredientsData() {
  const {
    ingredients,
    setIngredients,
    cocktails,
    setCocktails,
    usageMap,
    setUsageMap,
    loading,
    setLoading,
    baseIngredients,
    ingredientTags,
    setIngredientTags,
    ingredientsByTag,
    setImporting,
  } = useContext(IngredientUsageContext);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setImporting(false);
      try {
        const [ing, cocks, allowSubs, customTags] = await Promise.all([
          getAllIngredients(),
          getAllCocktails(),
          getAllowSubstitutes(),
          getAllTags(),
        ]);

        // getAllIngredients must return ingredients sorted alphabetically.
        const byId = new Map(ing.map((i) => [i.id, i]));
        const byBase = new Map();
        ing.forEach((i) => {
          const baseId = i.baseIngredientId ?? i.id;
          if (!byBase.has(baseId)) byBase.set(baseId, []);
          byBase.get(baseId).push(i);
        });
        const map = mapCocktailsByIngredient(ing, cocks, {
          allowSubstitutes: !!allowSubs,
          byId,
          byBase,
        });
        const cocktailMap = new Map(cocks.map((c) => [c.id, c.name]));
        const withUsage = ing.map((item) => {
          const ids = map[item.id] || [];
          const usageCount = ids.length;
          const singleCocktailName =
            usageCount === 1 ? cocktailMap.get(ids[0]) : null;
          const searchName = normalizeSearch(item.name);
          const searchTokens = searchName.split(WORD_SPLIT_RE).filter(Boolean);
          return {
            ...item,
            searchName,
            searchTokens,
            usageCount,
            singleCocktailName,
          };
        });
        setIngredients(withUsage);
        setCocktails(cocks);
        setUsageMap(map);
        const nextTags = [
          ...BUILTIN_INGREDIENT_TAGS,
          ...((customTags || [])),
        ];
        let changed =
          ingredientTags.length !== nextTags.length ||
          ingredientTags.some(
            (t, idx) =>
              t.id !== nextTags[idx].id ||
              t.name !== nextTags[idx].name ||
              t.color !== nextTags[idx].color
          );
        if (changed) setIngredientTags(nextTags);
      } finally {
        setLoading(false);
        setImporting(false);
      }
    },
    [
      setIngredients,
      setCocktails,
      setUsageMap,
      setLoading,
      setIngredientTags,
      setImporting,
      ingredientTags,
    ]
  );

  useEffect(() => {
    if (loading) {
      load();
    }
  }, [loading, load]);

  useEffect(() => {
    const sub = addAllowSubstitutesListener(() => {
      load();
    });
    return () => sub.remove();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return {
    ingredients,
    baseIngredients,
    cocktails,
    usageMap,
    ingredientTags,
    ingredientsByTag,
    refresh,
    loading,
    setIngredients,
  };
}

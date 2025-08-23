import { useCallback, useContext, useEffect } from "react";
import { getAllIngredients } from "../storage/ingredientsStorage";
import { getAllCocktails } from "../storage/cocktailsStorage";
import { importCocktailsAndIngredients } from "../../scripts/importCocktailsAndIngredients";
import { mapCocktailsByIngredient } from "../utils/ingredientUsage";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import IngredientUsageContext from "../context/IngredientUsageContext";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../storage/settingsStorage";

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
  } = useContext(IngredientUsageContext);

  const load = useCallback(async () => {
    setLoading(true);
    await importCocktailsAndIngredients({ force: false });
    const [ing, cocks, allowSubs] = await Promise.all([
      getAllIngredients(),
      getAllCocktails(),
      getAllowSubstitutes(),
    ]);
    const sorted = [...ing].sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );
    const map = mapCocktailsByIngredient(sorted, cocks, {
      allowSubstitutes: !!allowSubs,
    });
    const cocktailMap = new Map(cocks.map((c) => [c.id, c.name]));
    const withUsage = sorted.map((item) => {
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
    setLoading(false);
  }, [setIngredients, setCocktails, setUsageMap, setLoading]);

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
    await load();
  }, [load]);

  return {
    ingredients,
    baseIngredients,
    cocktails,
    usageMap,
    refresh,
    loading,
    setIngredients,
  };
}

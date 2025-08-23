import { useCallback, useContext, useEffect } from "react";
import { getAllIngredients } from "../storage/ingredientsStorage";
import { getAllCocktails } from "../storage/cocktailsStorage";
import { importCocktailsAndIngredients } from "../../scripts/importCocktailsAndIngredients";
import { mapCocktailsByIngredientAsync } from "../utils/ingredientUsage";
import { normalizeSearch } from "../utils/normalizeSearch";
import {
  useIngredientsContext,
  useCocktailsContext,
  useUsageMapContext,
  useLoadingContext,
} from "../context/IngredientUsageContext";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../storage/settingsStorage";

export default function useIngredientsData() {
  const { ingredients, baseIngredients, setIngredients } = useIngredientsContext();
  const { cocktails, setCocktails } = useCocktailsContext();
  const { usageMap, setUsageMap } = useUsageMapContext();
  const { loading, setLoading } = useLoadingContext();

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
    const map = await mapCocktailsByIngredientAsync(sorted, cocks, {
      allowSubstitutes: !!allowSubs,
    });
    const cocktailMap = new Map(cocks.map((c) => [c.id, c.name]));
    const withUsage = sorted.map((item) => {
      const ids = map[item.id] || [];
      const usageCount = ids.length;
      const singleCocktailName = usageCount === 1 ? cocktailMap.get(ids[0]) : null;
      return {
        ...item,
        searchName: normalizeSearch(item.name),
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

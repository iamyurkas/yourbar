import { useCallback, useContext, useEffect } from "react";
import { getAllIngredients } from "../storage/ingredientsStorage";
import { getAllCocktails } from "../storage/cocktailsStorage";
import { mapCocktailsByIngredient } from "../utils/ingredientUsage";
import IngredientUsageContext from "../context/IngredientUsageContext";

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
  } = useContext(IngredientUsageContext);

  const load = useCallback(async () => {
    setLoading(true);
    const [ing, cocks] = await Promise.all([
      getAllIngredients(),
      getAllCocktails(),
    ]);
    const sorted = [...ing].sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );
    const map = mapCocktailsByIngredient(sorted, cocks);
    const cocktailMap = new Map(cocks.map((c) => [c.id, c.name]));
    const withUsage = sorted.map((item) => {
      const ids = map[item.id] || [];
      const usageCount = ids.length;
      const singleCocktailName = usageCount === 1 ? cocktailMap.get(ids[0]) : null;
      return {
        ...item,
        searchName: item.name.toLowerCase(),
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

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { ingredients, cocktails, usageMap, refresh, loading, setIngredients };
}

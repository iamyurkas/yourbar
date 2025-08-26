import { useCallback, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllIngredients } from "../storage/ingredientsStorage";
import { getAllCocktails } from "../storage/cocktailsStorage";
import { mapCocktailsByIngredient } from "../utils/ingredientUsage";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import IngredientUsageContext from "../context/IngredientUsageContext";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../storage/settingsStorage";
import { sortByName } from "../utils/sortByName";

const IMPORT_FLAG_KEY = "default_data_imported_flag";

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

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      let needImport = force;
      if (!force) {
        try {
          const already = await AsyncStorage.getItem(IMPORT_FLAG_KEY);
          if (already !== "true") needImport = true;
        } catch {
          needImport = true;
        }
      }
      if (needImport) {
        console.log(
          "Importing default data… This one-time operation may take a moment"
        );
        const { importCocktailsAndIngredients } = await import(
          "../../scripts/importCocktailsAndIngredients"
        );
        await importCocktailsAndIngredients({ force });
      }
      const [ing, cocks, allowSubs] = await Promise.all([
        getAllIngredients(),
        getAllCocktails(),
        getAllowSubstitutes(),
      ]);
    const sorted = [...ing].sort(sortByName);
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
    },
    [setIngredients, setCocktails, setUsageMap, setLoading]
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
    refresh,
    loading,
    setIngredients,
  };
}

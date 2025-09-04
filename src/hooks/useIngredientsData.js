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
  getIgnoreGarnish,
  addIgnoreGarnishListener,
} from "../storage/settingsStorage";
import { sortByName } from "../utils/sortByName";
import { getAllTags } from "../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import {
  buildIngredientIndex,
  getCocktailIngredientInfo,
} from "../utils/cocktailIngredients";

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
        const [
          already,
          ingInitial,
          cocksInitial,
          allowSubs,
          ignoreGarnish,
          customTags,
        ] = await Promise.all([
          force ? null : AsyncStorage.getItem(IMPORT_FLAG_KEY),
          getAllIngredients(),
          getAllCocktails(),
          getAllowSubstitutes(),
          getIgnoreGarnish(),
          getAllTags(),
        ]);

        let ing = ingInitial;
        let cocks = cocksInitial;

        let needImport =
          force ||
          already !== "true" ||
          ing.length === 0 ||
          cocks.length === 0;

        if (needImport) {
          setImporting(true);
          const { importCocktailsAndIngredients } = await import(
            "../../scripts/importCocktailsAndIngredients"
          );
          await importCocktailsAndIngredients({ force: true });
          [ing, cocks] = await Promise.all([
            getAllIngredients(),
            getAllCocktails(),
          ]);
        }

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
        const { ingMap, findBrand } = buildIngredientIndex(withUsage);
        const cocktailsWithInfo = cocks.map((c) => ({
          ...c,
          ...getCocktailIngredientInfo(c, {
            ingMap,
            findBrand,
            allowSubstitutes: !!allowSubs,
            ignoreGarnish: !!ignoreGarnish,
          }),
        }));
        setCocktails(cocktailsWithInfo);
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
    const subAs = addAllowSubstitutesListener(() => {
      load();
    });
    const subIg = addIgnoreGarnishListener(() => {
      load();
    });
    return () => {
      subAs.remove();
      subIg.remove();
    };
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

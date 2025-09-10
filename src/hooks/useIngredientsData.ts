import { useCallback, useContext, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllIngredients } from "../domain/ingredients";
import { getAllCocktails } from "../domain/cocktails";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import IngredientUsageContext from "../context/IngredientUsageContext";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../data/settings";
import { sortByName } from "../utils/sortByName";
import { getAllTags } from "../data/ingredientTags";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";

const IMPORT_FLAG_KEY = "default_data_imported_flag";

export default function useIngredientsData() {
  const {
    ingredients,
    setIngredients,
    cocktails,
    setCocktails,
    usageMap,
    updateUsageMap,
    loading,
    setLoading,
    baseIngredients,
    ingredientTags,
    setIngredientTags,
    ingredientsByTag,
    setImporting,
  } = useContext(IngredientUsageContext);

  const prevIngredientsRef = useRef([]);
  const prevCocktailsRef = useRef([]);
  const prevByIdRef = useRef(new Map());
  const prevByBaseRef = useRef(new Map());

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setImporting(false);
      try {
        const [already, ingInitial, cocksInitial, allowSubs, customTags] =
          await Promise.all([
            force ? null : AsyncStorage.getItem(IMPORT_FLAG_KEY),
            getAllIngredients(),
            getAllCocktails(),
            getAllowSubstitutes(),
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
        const byId = new Map(sorted.map((i) => [i.id, i]));
        const byBase = new Map();
        sorted.forEach((i) => {
          const baseId = i.baseIngredientId ?? i.id;
          if (!byBase.has(baseId)) byBase.set(baseId, []);
          byBase.get(baseId).push(i);
        });

        const prevIngredients = prevIngredientsRef.current;
        const prevCocktails = prevCocktailsRef.current;
        const prevById = prevByIdRef.current;
        const prevByBase = prevByBaseRef.current;

        const changedIngredientIds = [] as string[];
        sorted.forEach((i) => {
          const prev = prevById.get(i.id);
          if (
            !prev ||
            prev.name !== i.name ||
            prev.baseIngredientId !== i.baseIngredientId
          ) {
            changedIngredientIds.push(i.id);
          }
        });
        prevById.forEach((_, id) => {
          if (!byId.has(id)) changedIngredientIds.push(id);
        });

        const prevCocktailMap = new Map(prevCocktails.map((c) => [c.id, c]));
        const changedCocktailIds = [] as string[];
        cocks.forEach((c) => {
          const prev = prevCocktailMap.get(c.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(c)) {
            changedCocktailIds.push(c.id);
          }
        });
        prevCocktailMap.forEach((_, id) => {
          if (!cocks.some((c) => c.id === id)) changedCocktailIds.push(id);
        });

        const map = updateUsageMap(sorted, cocks, {
          allowSubstitutes: !!allowSubs,
          byId,
          byBase,
          prevIngredients,
          prevCocktails,
          prevById,
          prevByBase,
          changedIngredientIds,
          changedCocktailIds,
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

        prevIngredientsRef.current = sorted;
        prevCocktailsRef.current = cocks;
        prevByIdRef.current = byId;
        prevByBaseRef.current = byBase;
      } finally {
        setLoading(false);
        setImporting(false);
      }
    },
    [
      setIngredients,
      setCocktails,
      updateUsageMap,
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

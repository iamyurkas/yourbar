import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  applyUsageMapToIngredients,
  updateUsageMap as updateUsageMapIncremental,
} from "../domain/ingredientUsage";
import { sortByName } from "../utils/sortByName";
import { groupIngredientsByTag } from "../domain/groupIngredientsByTag";

function buildByBaseFromArray(list) {
  const map = new Map();
  list.forEach((item) => {
    const baseId = item.baseIngredientId ?? item.id;
    if (!map.has(baseId)) map.set(baseId, []);
    map.get(baseId).push(item);
  });
  return map;
}

function toIngredientArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return Array.from(value.values());
  if (typeof value === "object") return Object.values(value);
  return [];
}

function toIngredientMap(value, fallback) {
  if (value == null) return fallback;
  if (value instanceof Map) return value;
  if (Array.isArray(value)) return new Map(value.map((i) => [i.id, i]));
  if (typeof value === "object") {
    return new Map(Object.values(value).map((i) => [i.id, i]));
  }
  return fallback;
}

const IngredientUsageContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
  applyIngredientCocktailUpdates: () => ({
    ingredients: [],
    cocktails: [],
    usageMap: {},
    ingredientsMap: new Map(),
  }),
  ingredients: [],
  ingredientsById: new Map(),
  ingredientsByBase: new Map(),
  setIngredients: () => {},
  cocktails: [],
  setCocktails: () => {},
  loading: true,
  setLoading: () => {},
  importing: false,
  setImporting: () => {},
  baseIngredients: [],
  ingredientTags: [],
  setIngredientTags: () => {},
  ingredientsByTag: new Map(),
});

export function IngredientUsageProvider({ children }) {
  const [usageMap, setUsageMap] = useState({});
  const [ingredientsMap, setIngredientsMap] = useState(new Map());
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseIngredients, setBaseIngredients] = useState([]);
  const [ingredientTags, setIngredientTags] = useState([]);
  const [importing, setImporting] = useState(false);
  const ingredients = useMemo(
    () => Array.from(ingredientsMap.values()),
    [ingredientsMap]
  );

  const ingredientsById = useMemo(() => ingredientsMap, [ingredientsMap]);

  const ingredientsByBase = useMemo(() => {
    const map = new Map();
    ingredients.forEach((i) => {
      const baseId = i.baseIngredientId ?? i.id;
      if (!map.has(baseId)) map.set(baseId, []);
      map.get(baseId).push(i);
    });
    return map;
  }, [ingredients]);

  const ingredientsByTag = useMemo(
    () => groupIngredientsByTag(ingredients, ingredientTags),
    [ingredients, ingredientTags]
  );

  const cocktailsRef = useRef(cocktails);
  const ingredientsListRef = useRef(ingredients);
  const ingredientsMapRef = useRef(ingredientsMap);
  const ingredientsByBaseRef = useRef(ingredientsByBase);
  const ingredientsByIdRef = useRef(ingredientsById);
  const usageMapRef = useRef(usageMap);

  useEffect(() => {
    cocktailsRef.current = cocktails;
  }, [cocktails]);

  useEffect(() => {
    ingredientsListRef.current = ingredients;
  }, [ingredients]);

  useEffect(() => {
    ingredientsMapRef.current = ingredientsMap;
  }, [ingredientsMap]);

  useEffect(() => {
    ingredientsByBaseRef.current = ingredientsByBase;
  }, [ingredientsByBase]);

  useEffect(() => {
    ingredientsByIdRef.current = ingredientsById;
  }, [ingredientsById]);

  useEffect(() => {
    usageMapRef.current = usageMap;
  }, [usageMap]);

  const setIngredients = useCallback((next) => {
    setIngredientsMap((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (value instanceof Map) return value;
      if (Array.isArray(value)) return new Map(value.map((i) => [i.id, i]));
      return new Map(Object.entries(value));
    });
  }, []);

  const applyIngredientCocktailUpdates = useCallback((changes = {}) => {
    const {
      ingredients: ingredientsUpdate,
      cocktails: cocktailsUpdate,
      usageMap: overrideUsage,
      changedIngredientIds = [],
      changedCocktailIds = [],
      allowSubstitutes = false,
      prevCocktails,
      prevIngredients,
      byId,
      byBase,
      prevById,
      prevByBase,
    } = changes;

    const prevCocktailsList = prevCocktails || cocktailsRef.current;
    const prevIngredientsMap = ingredientsMapRef.current;
    const prevIngredientsList =
      prevIngredients != null
        ? toIngredientArray(prevIngredients)
        : ingredientsListRef.current;

    let nextCocktailsList = prevCocktailsList;
    if (cocktailsUpdate !== undefined) {
      const produced =
        typeof cocktailsUpdate === "function"
          ? cocktailsUpdate(prevCocktailsList)
          : cocktailsUpdate;
      if (Array.isArray(produced)) {
        nextCocktailsList = produced;
      }
    }

    let nextIngredientsMap = prevIngredientsMap;
    if (ingredientsUpdate !== undefined) {
      const produced =
        typeof ingredientsUpdate === "function"
          ? ingredientsUpdate(prevIngredientsMap)
          : ingredientsUpdate;
      nextIngredientsMap = toIngredientMap(produced, prevIngredientsMap);
    }

    const nextIngredientsList = Array.from(nextIngredientsMap.values());

    const nextById = byId || nextIngredientsMap;
    const nextByBase = byBase || buildByBaseFromArray(nextIngredientsList);

    const prevIngredientsArray =
      prevIngredients != null ? toIngredientArray(prevIngredients) : null;

    const prevByIdValue =
      prevById ||
      (prevIngredientsArray
        ? new Map(prevIngredientsArray.map((i) => [i.id, i]))
        : ingredientsByIdRef.current);

    const prevByBaseValue =
      prevByBase ||
      (prevIngredientsArray
        ? buildByBaseFromArray(prevIngredientsArray)
        : ingredientsByBaseRef.current);

    let nextUsage = overrideUsage;
    if (!nextUsage) {
      nextUsage = updateUsageMapIncremental(
        usageMapRef.current,
        nextIngredientsList,
        nextCocktailsList,
        {
          changedIngredientIds,
          changedCocktailIds,
          allowSubstitutes,
          prevCocktails: prevCocktails || prevCocktailsList,
          prevIngredients: prevIngredientsArray || prevIngredientsList,
          byId: nextById,
          byBase: nextByBase,
          prevById: prevByIdValue,
          prevByBase: prevByBaseValue,
        }
      );
    }

    const nextIngredientsWithUsage = applyUsageMapToIngredients(
      nextIngredientsList,
      nextUsage,
      nextCocktailsList
    );
    const finalIngredientsMap = new Map(
      nextIngredientsWithUsage.map((item) => [item.id, item])
    );
    const finalByBase = buildByBaseFromArray(nextIngredientsWithUsage);

    cocktailsRef.current = nextCocktailsList;
    ingredientsListRef.current = nextIngredientsWithUsage;
    ingredientsMapRef.current = finalIngredientsMap;
    ingredientsByBaseRef.current = finalByBase;
    ingredientsByIdRef.current = finalIngredientsMap;
    usageMapRef.current = nextUsage;

    setCocktails(nextCocktailsList);
    setIngredients(finalIngredientsMap);
    setUsageMap(nextUsage);

    return {
      cocktails: nextCocktailsList,
      ingredients: nextIngredientsWithUsage,
      usageMap: nextUsage,
      ingredientsMap: finalIngredientsMap,
    };
  }, [setCocktails, setIngredients, setUsageMap]);

  const updateUsageMap = useCallback(
    (ings, cocks, options = {}) => {
      const result = applyIngredientCocktailUpdates({
        ingredients: ings,
        cocktails: cocks,
        changedIngredientIds: options.changedIngredientIds,
        changedCocktailIds: options.changedCocktailIds,
        allowSubstitutes: options.allowSubstitutes,
        prevCocktails: options.prevCocktails,
        prevIngredients: options.prevIngredients,
        byId: options.byId,
        byBase: options.byBase,
        prevById: options.prevById,
        prevByBase: options.prevByBase,
        usageMap: options.usageMap,
      });
      return result.usageMap;
    },
    [applyIngredientCocktailUpdates]
  );

  const baseRef = useRef([]);

  useEffect(() => {
    const nextBaseList = ingredients.filter(
      (i) => i.baseIngredientId == null
    );
    const prev = baseRef.current;
    let changed = prev.length !== nextBaseList.length;
    if (!changed) {
      for (let idx = 0; idx < nextBaseList.length; idx++) {
        const p = prev[idx];
        const n = nextBaseList[idx];
        if (p.id !== n.id || p.name !== n.name) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;
    baseRef.current = nextBaseList.map(({ id, name }) => ({ id, name }));
    const sorted = [...nextBaseList].sort(sortByName);
    setBaseIngredients(sorted);
  }, [ingredients]);

  return (
    <IngredientUsageContext.Provider
      value={{
        usageMap,
        setUsageMap,
        updateUsageMap,
        applyIngredientCocktailUpdates,
        ingredients,
        ingredientsById,
        ingredientsByBase,
        setIngredients,
        cocktails,
        setCocktails,
        loading,
        setLoading,
        importing,
        setImporting,
        baseIngredients,
        ingredientTags,
        setIngredientTags,
        ingredientsByTag,
      }}
    >
      {children}
    </IngredientUsageContext.Provider>
  );
}

export function useIngredientUsage() {
  return useContext(IngredientUsageContext);
}

export default IngredientUsageContext;

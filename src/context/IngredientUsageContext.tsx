import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { updateUsageMap as updateUsageMapIncremental } from "../domain/ingredientUsage";
import { sortByName } from "../utils/sortByName";
import { groupIngredientsByTag } from "../domain/groupIngredientsByTag";

const IngredientUsageContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
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

  const setIngredients = useCallback((next) => {
    setIngredientsMap((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (value instanceof Map) return value;
      if (Array.isArray(value)) return new Map(value.map((i) => [i.id, i]));
      return new Map(Object.entries(value));
    });
  }, []);

  const updateUsageMap = useCallback(
    (ings, cocks, options = {}) => {
      const useCached = ings === ingredients;
      const byId =
        options.byId || (useCached ? ingredientsById : new Map(ings.map((i) => [i.id, i])));
      const byBase =
        options.byBase ||
        (useCached
          ? ingredientsByBase
          : (() => {
              const map = new Map();
              ings.forEach((i) => {
                const baseId = i.baseIngredientId ?? i.id;
                if (!map.has(baseId)) map.set(baseId, []);
                map.get(baseId).push(i);
              });
              return map;
            })());
      const opts = { ...options, byId, byBase };
      if (options.prevIngredients && !options.prevById && !options.prevByBase) {
        const prevById = new Map(
          options.prevIngredients.map((i) => [i.id, i])
        );
        const prevByBase = (() => {
          const map = new Map();
          options.prevIngredients.forEach((i) => {
            const baseId = i.baseIngredientId ?? i.id;
            if (!map.has(baseId)) map.set(baseId, []);
            map.get(baseId).push(i);
          });
          return map;
        })();
        opts.prevById = prevById;
        opts.prevByBase = prevByBase;
      }
      let next;
      setUsageMap((prev) => {
        next = updateUsageMapIncremental(prev, ings, cocks, opts);
        return next;
      });
      return next;
    },
    [ingredients, ingredientsById, ingredientsByBase]
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

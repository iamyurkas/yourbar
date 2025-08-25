import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { updateUsageMap as updateUsageMapUtil } from "../utils/ingredientUsage";
import { sortByName } from "../utils/sortByName";

const IngredientUsageContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
  ingredients: [],
  ingredientsById: new Map(),
  setIngredients: () => {},
  cocktails: [],
  setCocktails: () => {},
  loading: true,
  setLoading: () => {},
  baseIngredients: [],
});

export function IngredientUsageProvider({ children }) {
  const [usageMap, setUsageMap] = useState({});
  const [ingredientsMap, setIngredientsMap] = useState(new Map());
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseIngredients, setBaseIngredients] = useState([]);

  const ingredients = useMemo(
    () => Array.from(ingredientsMap.values()),
    [ingredientsMap]
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
    (ingredients, cocktails, options) => {
      setUsageMap((prev) =>
        updateUsageMapUtil(prev, ingredients, cocktails, options)
      );
    },
    []
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
        ingredientsById: ingredientsMap,
        setIngredients,
        cocktails,
        setCocktails,
        loading,
        setLoading,
        baseIngredients,
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

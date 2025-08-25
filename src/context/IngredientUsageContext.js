import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { updateUsageMap as updateUsageMapUtil } from "../utils/ingredientUsage";
import { buildIndex } from "../storage/ingredientsStorage";

const IngredientUsageContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
  ingredients: [],
  ingredientsById: {},
  setIngredients: () => {},
  updateIngredient: () => {},
  removeIngredient: () => {},
  cocktails: [],
  setCocktails: () => {},
  loading: true,
  setLoading: () => {},
  baseIngredients: [],
});

export function IngredientUsageProvider({ children }) {
  const [usageMap, setUsageMap] = useState({});
  const ingredientsRef = useRef([]);
  const indexRef = useRef({});
  const [ingredientsVersion, setIngredientsVersion] = useState(0);
  const [ingredientsById, setIngredientsById] = useState({});
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseIngredients, setBaseIngredients] = useState([]);

  const setIngredients = useCallback((next) => {
    const value =
      typeof next === "function" ? next(ingredientsRef.current) : next;
    ingredientsRef.current = Array.isArray(value) ? value : [];
    setIngredientsById(buildIndex(ingredientsRef.current));
    const idx = {};
    ingredientsRef.current.forEach((item, i) => {
      idx[item.id] = i;
    });
    indexRef.current = idx;
    setIngredientsVersion((v) => v + 1);
  }, []);

  const updateIngredient = useCallback((id, changes) => {
    const list = ingredientsRef.current;
    const idx = indexRef.current[id];
    if (idx == null) return null;
    const updated = { ...list[idx], ...changes };
    list[idx] = updated;
    setIngredientsById((prev) => ({ ...prev, [id]: updated }));
    setIngredientsVersion((v) => v + 1);
    return updated;
  }, []);

  const removeIngredient = useCallback((id) => {
    const list = ingredientsRef.current;
    const idx = indexRef.current[id];
    if (idx == null) return;
    list.splice(idx, 1);
    delete indexRef.current[id];
    for (let i = idx; i < list.length; i++) {
      indexRef.current[list[i].id] = i;
    }
    setIngredientsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setIngredientsVersion((v) => v + 1);
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
    const list = ingredientsRef.current;
    const nextBaseList = list.filter((i) => i.baseIngredientId == null);
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
    const sorted = [...nextBaseList].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "uk", {
        sensitivity: "base",
      })
    );
    setBaseIngredients(sorted);
  }, [ingredientsVersion]);

  return (
    <IngredientUsageContext.Provider
      value={{
        usageMap,
        setUsageMap,
        updateUsageMap,
        ingredients: ingredientsRef.current,
        ingredientsById,
        setIngredients,
        updateIngredient,
        removeIngredient,
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

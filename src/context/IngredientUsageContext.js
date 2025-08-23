import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { InteractionManager } from "react-native";
import { updateUsageMap as updateUsageMapUtil } from "../utils/ingredientUsage";
import { buildIndex } from "../storage/ingredientsStorage";

const IngredientUsageContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
  ingredients: [],
  ingredientsById: {},
  setIngredients: () => {},
  cocktails: [],
  setCocktails: () => {},
  loading: true,
  setLoading: () => {},
  baseIngredients: [],
});

export function IngredientUsageProvider({ children }) {
  const [usageMap, setUsageMap] = useState({});
  const [ingredients, setIngredientsState] = useState([]);
  const [ingredientsById, setIngredientsById] = useState({});
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseIngredients, setBaseIngredients] = useState([]);

  const setIngredients = useCallback((next) => {
    setIngredientsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      setIngredientsById(buildIndex(value));
      return value;
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

  useEffect(() => {
    let cancelled = false;
    InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const baseList = ingredients
        .filter((i) => i.baseIngredientId == null)
        .sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "uk", {
            sensitivity: "base",
          })
        );
      setBaseIngredients(baseList);
    });
    return () => {
      cancelled = true;
    };
  }, [ingredients]);

  return (
    <IngredientUsageContext.Provider
      value={{
        usageMap,
        setUsageMap,
        updateUsageMap,
        ingredients,
        ingredientsById,
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

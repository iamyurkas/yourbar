import React, { createContext, useContext, useState, useCallback } from "react";
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
});

export function IngredientUsageProvider({ children }) {
  const [usageMap, setUsageMap] = useState({});
  const [ingredients, setIngredientsState] = useState([]);
  const [ingredientsById, setIngredientsById] = useState({});
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading] = useState(true);

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

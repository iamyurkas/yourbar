import React, { createContext, useContext, useState, useCallback } from "react";
import { updateUsageMap as updateUsageMapUtil } from "../utils/ingredientUsage";

const IngredientUsageContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
  ingredients: [],
  setIngredients: () => {},
  cocktails: [],
  setCocktails: () => {},
  loading: true,
  setLoading: () => {},
});

export function IngredientUsageProvider({ children }) {
  const [usageMap, setUsageMap] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading] = useState(true);

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

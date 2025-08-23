import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { updateUsageMap as updateUsageMapUtil } from "../utils/ingredientUsage";
import { buildIndex } from "../storage/ingredientsStorage";

const IngredientsContext = createContext({
  ingredients: [],
  ingredientsById: {},
  setIngredients: () => {},
});

const CocktailsContext = createContext({
  cocktails: [],
  setCocktails: () => {},
});

const UsageMapContext = createContext({
  usageMap: {},
  setUsageMap: () => {},
  updateUsageMap: () => {},
});

const LoadingContext = createContext([true, () => {}]);

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

  const ingredientsValue = useMemo(
    () => ({ ingredients, ingredientsById, setIngredients }),
    [ingredients, ingredientsById, setIngredients]
  );
  const cocktailsValue = useMemo(
    () => ({ cocktails, setCocktails }),
    [cocktails, setCocktails]
  );
  const usageMapValue = useMemo(
    () => ({ usageMap, setUsageMap, updateUsageMap }),
    [usageMap, updateUsageMap]
  );
  const loadingValue = useMemo(() => [loading, setLoading], [loading, setLoading]);

  return (
    <LoadingContext.Provider value={loadingValue}>
      <IngredientsContext.Provider value={ingredientsValue}>
        <CocktailsContext.Provider value={cocktailsValue}>
          <UsageMapContext.Provider value={usageMapValue}>
            {children}
          </UsageMapContext.Provider>
        </CocktailsContext.Provider>
      </IngredientsContext.Provider>
    </LoadingContext.Provider>
  );
}

export function useIngredientsContext() {
  return useContext(IngredientsContext);
}

export function useCocktailsContext() {
  return useContext(CocktailsContext);
}

export function useUsageMapContext() {
  return useContext(UsageMapContext);
}

export function useLoadingContext() {
  const [loading, setLoading] = useContext(LoadingContext);
  return { loading, setLoading };
}

export function useIngredientUsage() {
  const ingredientsData = useIngredientsContext();
  const cocktailsData = useCocktailsContext();
  const usageMapData = useUsageMapContext();
  const { loading, setLoading } = useLoadingContext();
  return {
    ...ingredientsData,
    ...cocktailsData,
    ...usageMapData,
    loading,
    setLoading,
  };
}

export default {
  IngredientsContext,
  CocktailsContext,
  UsageMapContext,
  LoadingContext,
};

import { useEffect, useMemo, useState } from "react";
import { InteractionManager } from "react-native";
import {
  buildIngredientIndex,
  getCocktailIngredientInfo,
} from "../domain/cocktailIngredients";

export default function useAvailableByIngredient(
  ingredients: any,
  cocktails: any,
  usageMap: Record<string, number[]>,
  allowSubstitutes: boolean,
  ignoreGarnish: boolean,
  ingredientKey?: number
) {
  const compute = useMemo(() => {
    return () => {
      if (!Array.isArray(ingredients) || !Array.isArray(cocktails)) {
        return new Map();
      }
      const { ingMap, findBrand } = buildIngredientIndex(ingredients);
      const nameMap = new Map(cocktails.map((c: any) => [c.id, c.name]));
      const availableSet = new Set<number>();
      cocktails.forEach((c: any) => {
        const { isAllAvailable } = getCocktailIngredientInfo(c, {
          ingMap,
          findBrand,
          allowSubstitutes,
          ignoreGarnish,
        });
        if (isAllAvailable) availableSet.add(c.id);
      });
      const map = new Map<number, { count: number; name: string | null }>();
      ingredients.forEach((ing: any) => {
        const list = usageMap[ing.id] || [];
        const avail = list.filter((id: number) => availableSet.has(id));
        map.set(ing.id, {
          count: avail.length,
          name: avail.length === 1 ? (nameMap.get(avail[0]) as string) : null,
        });
      });
      return map;
    };
  }, [ingredients, cocktails, usageMap, allowSubstitutes, ignoreGarnish, ingredientKey]);

  const [result, setResult] = useState(
    new Map<number, { count: number; name: string | null }>()
  );

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      const map = compute();
      if (!cancelled) setResult(map);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [compute]);

  return result;
}

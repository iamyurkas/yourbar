import { useMemo } from "react";
import { computeAvailableCocktails } from "../domain/shakerService";

export default function useAvailableByIngredient(
  ingredients: any,
  cocktails: any,
  usageMap: Record<string, number[]>,
  allowSubstitutes: boolean,
  ignoreGarnish: boolean
) {
  return useMemo(() => {
    if (!Array.isArray(ingredients) || !Array.isArray(cocktails)) {
      return new Map<number, { count: number; name: string | null }>();
    }

    const nameMap = new Map(cocktails.map((c: any) => [c.id, c.name]));

    const { availableCocktailIds } = computeAvailableCocktails({
      recipeIds: cocktails.map((c: any) => c.id),
      cocktails,
      ingredients,
      allowSubstitutes,
      ignoreGarnish,
    });
    const availableSet = new Set<number>(availableCocktailIds);

    const map = new Map<number, { count: number; name: string | null }>();
    ingredients.forEach((ing: any) => {
      const list: number[] = usageMap[ing.id] || [];
      let count = 0;
      let singleId: number | null = null;
      for (let idx = 0; idx < list.length; idx += 1) {
        const cocktailId = list[idx];
        if (availableSet.has(cocktailId)) {
          count += 1;
          if (count === 1) {
            singleId = cocktailId;
          } else {
            singleId = null;
            break;
          }
        }
      }
      map.set(ing.id, {
        count,
        name: singleId != null ? (nameMap.get(singleId) as string | null) : null,
      });
    });
    return map;
  }, [
    ingredients,
    cocktails,
    usageMap,
    allowSubstitutes,
    ignoreGarnish,
  ]);
}

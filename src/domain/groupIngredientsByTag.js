import { sortByName } from "../utils/sortByName.js";

export function groupIngredientsByTag(ingredients, tags) {
  const map = new Map();
  tags.forEach((t) => map.set(t.id, []));
  ingredients.forEach((ing) => {
    if (Array.isArray(ing.tags)) {
      ing.tags.forEach((tag) => {
        if (map.has(tag.id)) {
          map.get(tag.id).push(ing);
        }
      });
    }
  });
  for (const arr of map.values()) {
    arr.sort(sortByName);
  }
  return map;
}

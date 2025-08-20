import { TAG_COLORS } from "../theme";
import { normalizeSearch } from "../utils/normalizeSearch";

export const BUILTIN_INGREDIENT_TAGS = [
  { id: 1, name: "strong alcohol", color: TAG_COLORS[0] },
  { id: 2, name: "soft alcohol", color: TAG_COLORS[1] },
  { id: 3, name: "beverage", color: TAG_COLORS[3] },
  { id: 4, name: "syrup", color: TAG_COLORS[13] },
  { id: 5, name: "juice", color: TAG_COLORS[10] },
  { id: 6, name: "fruit", color: TAG_COLORS[9] },
  { id: 7, name: "herb", color: TAG_COLORS[8] },
  { id: 8, name: "spice", color: TAG_COLORS[14] },
  { id: 9, name: "dairy", color: TAG_COLORS[6] },
  { id: 10, name: "other", color: TAG_COLORS[15] },
];

// Утиліти
export const ingredientTagById = (id) =>
  BUILTIN_INGREDIENT_TAGS.find((t) => t.id === id) || null;

export const searchIngredientTags = (q) => {
  const s = normalizeSearch(q);
  if (!s) return BUILTIN_INGREDIENT_TAGS;
  return BUILTIN_INGREDIENT_TAGS.filter((t) =>
    normalizeSearch(t.name).includes(s)
  );
};

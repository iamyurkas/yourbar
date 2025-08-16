import { TAG_COLORS } from "../theme";

export const BUILTIN_INGREDIENT_TAGS = [
  { id: 1, name: "strong alcohol", color: TAG_COLORS[0] },
  { id: 2, name: "soft alcohol", color: TAG_COLORS[1] },
  { id: 3, name: "beverage", color: TAG_COLORS[2] },
  { id: 4, name: "syrup", color: TAG_COLORS[3] },
  { id: 5, name: "juice", color: TAG_COLORS[4] },
  { id: 6, name: "fruit", color: TAG_COLORS[5] },
  { id: 7, name: "herb", color: TAG_COLORS[6] },
  { id: 8, name: "spice", color: TAG_COLORS[7] },
  { id: 9, name: "dairy", color: TAG_COLORS[8] },
  { id: 10, name: "other", color: TAG_COLORS[15] },
];

// Утиліти
export const ingredientTagById = (id) =>
  BUILTIN_INGREDIENT_TAGS.find((t) => t.id === id) || null;

export const searchIngredientTags = (q) => {
  const s = (q || "").trim().toLowerCase();
  if (!s) return BUILTIN_INGREDIENT_TAGS;
  return BUILTIN_INGREDIENT_TAGS.filter((t) =>
    t.name.toLowerCase().includes(s)
  );
};

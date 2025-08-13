export const BUILTIN_INGREDIENT_TAGS = [
  { id: 1, name: "strong alcohol", color: "#FF6B6B" },
  { id: 2, name: "soft alcohol", color: "#FFA94D" },
  { id: 3, name: "beverage", color: "#FFD43B" },
  { id: 4, name: "syrup", color: "#8AADCFFF" },
  { id: 5, name: "juice", color: "#c6daffff" },
  { id: 6, name: "fruit", color: "#69DB7C" },
  { id: 7, name: "herb", color: "#38D9A9" },
  { id: 8, name: "spice", color: "#000000ff" },
  { id: 9, name: "dairy", color: "#757575ff" },
  { id: 10, name: "other", color: "#AFC9C3FF" },
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

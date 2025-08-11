// src/constants/cocktailTags.js

// Вшиті (builtin) теги коктейлів: стабільні numeric id + читабельні кольори під білий текст
export const BUILTIN_COCKTAIL_TAGS = [
  // дані з твого списку
  { id: 1, name: "IBA Official", color: "#1E88E5" },
  { id: 2, name: "long", color: "#3F51B5" },
  { id: 3, name: "moderately strong", color: "#6F42C1" },
  { id: 4, name: "non-alcoholic", color: "#2E7D32" },
  { id: 5, name: "shooter", color: "#D81B60" },
  { id: 6, name: "soft", color: "#26A69A" },
  { id: 7, name: "strong", color: "#E53935" },
  { id: 8, name: "custom", color: "#AFC9C3FF" },
];

// Утиліти
export const cocktailTagById = (id) =>
  BUILTIN_COCKTAIL_TAGS.find((t) => t.id === id) || null;

export const searchCocktailTags = (q) => {
  const s = (q || "").trim().toLowerCase();
  if (!s) return BUILTIN_COCKTAIL_TAGS;
  return BUILTIN_COCKTAIL_TAGS.filter((t) => t.name.toLowerCase().includes(s));
};

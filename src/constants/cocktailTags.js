import { TAG_COLORS } from "../theme";

// Вшиті (builtin) теги коктейлів: стабільні numeric id + читабельні кольори під білий текст
export const BUILTIN_COCKTAIL_TAGS = [
  { id: 1, name: "IBA Official", color: TAG_COLORS[9] },
  { id: 2, name: "strong", color: TAG_COLORS[0] },
  { id: 3, name: "moderate", color: TAG_COLORS[1] },
  { id: 4, name: "soft", color: TAG_COLORS[12] },
  { id: 5, name: "long", color: TAG_COLORS[13] },
  { id: 6, name: "shooter", color: TAG_COLORS[14] },
  { id: 7, name: "non-alcoholic", color: TAG_COLORS[11] },
  { id: 8, name: "custom", color: TAG_COLORS[15] },
];

// Утиліти
export const cocktailTagById = (id) =>
  BUILTIN_COCKTAIL_TAGS.find((t) => t.id === id) || null;

export const searchCocktailTags = (q) => {
  const s = (q || "").trim().toLowerCase();
  if (!s) return BUILTIN_COCKTAIL_TAGS;
  return BUILTIN_COCKTAIL_TAGS.filter((t) => t.name.toLowerCase().includes(s));
};

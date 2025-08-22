import { TAG_COLORS } from "../theme";
import { normalizeSearch } from "../utils/normalizeSearch";

// Вшиті (builtin) теги коктейлів: стабільні numeric id + читабельні кольори під білий текст
export const BUILTIN_COCKTAIL_TAGS = [
  { id: 1, name: "IBA Official", color: TAG_COLORS[9] },
  { id: 2, name: "Unforgettables", color: TAG_COLORS[3] },
  { id: 3, name: "Contemporary", color: TAG_COLORS[5] },
  { id: 4, name: "New Era", color: TAG_COLORS[7] },
  { id: 5, name: "strong", color: TAG_COLORS[0] },
  { id: 6, name: "moderate", color: TAG_COLORS[1] },
  { id: 7, name: "soft", color: TAG_COLORS[12] },
  { id: 8, name: "long", color: TAG_COLORS[13] },
  { id: 9, name: "shooter", color: TAG_COLORS[14] },
  { id: 10, name: "non-alcoholic", color: TAG_COLORS[11] },
  { id: 11, name: "custom", color: TAG_COLORS[15] },
];

// Утиліти
export const cocktailTagById = (id) =>
  BUILTIN_COCKTAIL_TAGS.find((t) => t.id === id) || null;

export const searchCocktailTags = (q) => {
  const s = normalizeSearch(q);
  if (!s) return BUILTIN_COCKTAIL_TAGS;
  return BUILTIN_COCKTAIL_TAGS.filter((t) => normalizeSearch(t.name).includes(s));
};

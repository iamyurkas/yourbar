// src/constants/cocktailTags.js

// Вшиті (builtin) теги коктейлів: стабільні numeric id + читабельні кольори під білий текст
export const BUILTIN_COCKTAIL_TAGS = [
  { id: 1, name: "IBA Official", color: "#38D9A9" },
  { id: 2, name: "strong", color: "#FF6B6B" },
  { id: 3, name: "moderate", color: "#FF8787" },
  { id: 4, name: "soft", color: "#FFA94D" },
  { id: 5, name: "long", color: "#FFD43B" },
  { id: 6, name: "shooter", color: "#c78acfff" },
  { id: 7, name: "non-alcoholic", color: "#69DB7C" },
  { id: 8, name: "custom", color: "#AFC9C3FF" },
  //  { id: 9, name: "sweet", color: "#FF7F7F" },
  //  { id: 10, name: "sour", color: "#66C7C7" },
  //  { id: 11, name: "bitter", color: "#A970C4" },
  //  { id: 12, name: "spicy", color: "#FF9060" },
  //  { id: 13, name: "fruity", color: "#79C28D" },
  //  { id: 14, name: "creamy", color: "#9E9EF7" },
];

// Утиліти
export const cocktailTagById = (id) =>
  BUILTIN_COCKTAIL_TAGS.find((t) => t.id === id) || null;

export const searchCocktailTags = (q) => {
  const s = (q || "").trim().toLowerCase();
  if (!s) return BUILTIN_COCKTAIL_TAGS;
  return BUILTIN_COCKTAIL_TAGS.filter((t) => t.name.toLowerCase().includes(s));
};

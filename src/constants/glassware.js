// src/constants/glassware.js

// Якщо матимеш PNG у /assets/glassware, розкоментуй та додай require:
// const glassImages = {
//   bowl: require("../../assets/glassware/bowl.png"),
//   champagne_flute: require("../../assets/glassware/champagne_flute.png"),
//   ...
// };

export const GLASSWARE = [
  { id: "bowl", name: "Bowl", image: null /* glassImages?.bowl */ },
  { id: "champagne_flute", name: "Champagne Flute", image: null },
  { id: "cocktail_glass", name: "Cocktail glass", image: null },
  { id: "collins_glass", name: "Collins glass", image: null },
  { id: "copper_mug", name: "Copper mug", image: null }, // виправив "Cooper" -> Copper
  { id: "coupe", name: "Coupe", image: null },
  { id: "cup", name: "Cup", image: null },
  { id: "goblet", name: "Goblet", image: null },
  { id: "highball_glass", name: "Highball glass", image: null },
  { id: "hurricane_glass", name: "Hurricane glass", image: null },
  { id: "irish_coffee_glass", name: "Irish Coffee glass", image: null },
  { id: "margarita_glass", name: "Margarita glass", image: null },
  { id: "nick_and_nora", name: "Nick and Nora", image: null },
  { id: "pitcher", name: "Pitcher", image: null },
  { id: "pub_glass", name: "Pub glass", image: null },
  { id: "rocks_glass", name: "Rocks glass", image: null },
  { id: "shooter", name: "Shooter", image: null },
  { id: "snifter", name: "Snifter", image: null },
  { id: "tiki", name: "Tiki", image: null },
  { id: "wine_glass", name: "Wine glass", image: null },
];

// Утиліти (зручно мати під рукою)
export const getGlassById = (id) => GLASSWARE.find((g) => g.id === id) || null;
export const searchGlass = (q) => {
  const s = (q || "").trim().toLowerCase();
  if (!s) return GLASSWARE;
  return GLASSWARE.filter((g) => g.name.toLowerCase().includes(s));
};

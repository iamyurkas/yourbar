// src/constants/measureUnits.js

export const MEASURE_UNITS = [
  { id: 1, name: " ", plural: " " }, // пустий пункт
  { id: 2, name: "bar spoon", plural: "bar spoons" },
  { id: 3, name: "cl", plural: "cl" },
  { id: 4, name: "cube", plural: "cubes" },
  { id: 5, name: "cup", plural: "cups" },
  { id: 6, name: "dash", plural: "dashes" },
  { id: 7, name: "drop", plural: "drops" },
  { id: 8, name: "gr", plural: "gr" },
  { id: 9, name: "half", plural: "halves" },
  { id: 10, name: "leaf", plural: "leaves" },
  { id: 11, name: "ml", plural: "ml" },
  { id: 12, name: "oz", plural: "oz" },
  { id: 13, name: "part", plural: "parts" },
  { id: 14, name: "peel", plural: "peels" },
  { id: 15, name: "pinch", plural: "pinches" },
  { id: 16, name: "quarter", plural: "quarters" },
  { id: 17, name: "scoop", plural: "scoops" },
  { id: 18, name: "shaving", plural: "shavings" },
  { id: 19, name: "slice", plural: "slices" },
  { id: 20, name: "splash", plural: "splashes" },
  { id: 21, name: "spring", plural: "springs" },
  { id: 22, name: "stalk", plural: "stalks" },
  { id: 23, name: "tablespoon", plural: "tablespoons" },
  { id: 24, name: "teaspoon", plural: "teaspoons" },
  { id: 25, name: "third", plural: "thirds" },
  { id: 26, name: "twist", plural: "twists" },
  { id: 27, name: "wedge", plural: "wedges" },
];

// Handy IDs (optional, to avoid magic numbers in code)
export const UNIT_ID = Object.freeze({
  NONE: 1,
  BAR_SPOON: 2,
  CL: 3,
  CUBE: 4,
  CUP: 5,
  DASH: 6,
  DROP: 7,
  GR: 8,
  HALF: 9,
  LEAF: 10,
  ML: 11,
  OZ: 12,
  PART: 13,
  PEEL: 14,
  PINCH: 15,
  QUARTER: 16,
  SCOOP: 17,
  SHAVING: 18,
  SLICE: 19,
  SPLASH: 20,
  SPRING: 21,
  STALK: 22,
  TABLESPOON: 23,
  TEASPOON: 24,
  THIRD: 25,
  TWIST: 26,
  WEDGE: 27,
});

// Helpers (аналогічно до getGlassById / search)
export const getUnitById = (id) =>
  MEASURE_UNITS.find((u) => u.id === id) || null;

export const searchUnits = (q) => {
  const s = (q || "").trim().toLowerCase();
  if (!s) return MEASURE_UNITS;
  return MEASURE_UNITS.filter((u) => u.name.toLowerCase().includes(s));
};

// Return singular or plural unit name based on quantity
export const formatUnit = (unit, quantity) => {
  // unit can be an object from MEASURE_UNITS or a string name
  const u =
    typeof unit === "string"
      ? MEASURE_UNITS.find((m) => m.name === unit || m.plural === unit)
      : unit;
  if (!u) return typeof unit === "string" ? unit : "";
  const q = Number(quantity);
  if (!Number.isFinite(q) || q === 1) return u.name;
  return u.plural || u.name;
};

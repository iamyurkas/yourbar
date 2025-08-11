// src/constants/measureUnits.js

export const MEASURE_UNITS = [
  { id: 1, name: "" }, // пустий пункт
  { id: 2, name: "bar spoon" },
  { id: 3, name: "cl" },
  { id: 4, name: "cube" },
  { id: 5, name: "cup" },
  { id: 6, name: "dash" },
  { id: 7, name: "drop" },
  { id: 8, name: "gr" },
  { id: 9, name: "half" },
  { id: 10, name: "leaf" },
  { id: 11, name: "ml" },
  { id: 12, name: "oz" },
  { id: 13, name: "part" },
  { id: 14, name: "peel" },
  { id: 15, name: "pinch" },
  { id: 16, name: "quarter" },
  { id: 17, name: "scoop" },
  { id: 18, name: "shaving" },
  { id: 19, name: "slice" },
  { id: 20, name: "splash" },
  { id: 21, name: "spring" },
  { id: 22, name: "stalk" },
  { id: 23, name: "tablespoon" },
  { id: 24, name: "teaspoon" },
  { id: 25, name: "third" },
  { id: 26, name: "twist" },
  { id: 27, name: "wedge" },
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

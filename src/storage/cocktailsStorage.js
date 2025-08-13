// src/storage/cocktailsStorage.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "cocktails_v1";

// --- utils ---
const safeParse = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const now = () => Date.now();
const genId = () => now(); // сумісно з твоїми екранами (Date.now())

const sanitizeIngredient = (r, idx) => ({
  order: Number(r?.order ?? idx + 1),
  ingredientId: r?.ingredientId ?? null, // може бути null для фрітекасту
  name: String(r?.name ?? "").trim(),
  amount: String(r?.amount ?? "").trim(),
  unitId: Number(r?.unitId ?? 11), // ml за замовчуванням
  garnish: !!r?.garnish,
  optional: !!r?.optional,
  allowBaseSubstitution: !!r?.allowBaseSubstitution,
});

const sanitizeCocktail = (c) => {
  const t = now();
  const id = Number(c?.id ?? genId());
  const ingredients = Array.isArray(c?.ingredients) ? c.ingredients : [];
  return {
    id,
    name: String(c?.name ?? "").trim(),
    photoUri: c?.photoUri ?? null,
    // зберігаємо ідентифікатор ємності (склянки) в якій подається коктейль
    glassId: c?.glassId ? String(c.glassId).trim() : null,
    tags: Array.isArray(c?.tags) ? c.tags : [],
    description: String(c?.description ?? ""),
    instructions: String(c?.instructions ?? ""),
    ingredients: ingredients
      .map(sanitizeIngredient)
      .sort((a, b) => a.order - b.order),
    createdAt: Number(c?.createdAt ?? t),
    updatedAt: t,
  };
};

// --- low-level IO ---
async function readAll() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}
async function writeAll(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

// --- API ---
/** Return all cocktails (array) */
export async function getAllCocktails() {
  return await readAll();
}

/** Get single cocktail by id (number) */
export async function getCocktailById(id) {
  const list = await readAll();
  return list.find((c) => c.id === id) || null;
}

/** Add new cocktail, returns created cocktail */
export async function addCocktail(cocktail) {
  const list = await readAll();
  const item = sanitizeCocktail({ ...cocktail, id: cocktail?.id ?? genId() });
  // уникнути дубля за id
  const existsIdx = list.findIndex((x) => x.id === item.id);
  if (existsIdx >= 0) {
    list[existsIdx] = item;
  } else {
    list.push(item);
  }
  await writeAll(list);
  return item;
}

/** Update existing (upsert). Returns updated cocktail */
export async function saveCocktail(updated) {
  const list = await readAll();
  const item = sanitizeCocktail(updated);
  const idx = list.findIndex((c) => c.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item); // upsert поведінка
  await writeAll(list);
  return item;
}

/** Delete by id */
export async function deleteCocktail(id) {
  const list = await readAll();
  const next = list.filter((c) => c.id !== id);
  if (next.length !== list.length) {
    await writeAll(next);
  }
}

/** Replace whole storage (use carefully) */
export async function replaceAllCocktails(cocktails) {
  const normalized = Array.isArray(cocktails)
    ? cocktails.map(sanitizeCocktail)
    : [];
  await writeAll(normalized);
  return normalized;
}

/** Simple search by name substring (case-insensitive) */
export async function searchCocktails(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return getAllCocktails();
  const list = await readAll();
  return list.filter((c) => c.name.toLowerCase().includes(q));
}

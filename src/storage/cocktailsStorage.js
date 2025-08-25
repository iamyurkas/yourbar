// src/storage/cocktailsStorage.js
import { normalizeSearch } from "../utils/normalizeSearch";
import { sortByName } from "../utils/sortByName";
import db, { query } from "./sqlite";

// --- utils ---

const now = () => Date.now();
const genId = () => now(); // сумісно з твоїми екранами (Date.now())

const sanitizeIngredient = (r, idx) => ({
  order: Number(r?.order ?? idx + 1),
  ingredientId: r?.ingredientId ?? null, // може бути null для фрітекасту
  name: String(r?.name ?? "").trim(),
  amount: String(r?.amount ?? r?.quantity ?? "").trim(),
  unitId: Number(r?.unitId ?? 11), // ml за замовчуванням
  garnish: !!r?.garnish,
  optional: !!r?.optional,
  allowBaseSubstitution: !!(
    r?.allowBaseSubstitution ?? r?.allowBaseSubstitute
  ),
  allowBrandedSubstitutes: !!r?.allowBrandedSubstitutes,
  substitutes: Array.isArray(r?.substitutes)
    ? r.substitutes.map((s) => ({ id: s.id, name: s.name }))
    : [],
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
    rating: Math.min(5, Math.max(0, Number(c?.rating ?? 0))),
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

async function readAll() {
  const res = await query("SELECT data FROM cocktails");
  const list = res.rows._array.map((r) => JSON.parse(r.data));
  return list.sort(sortByName);
}

async function upsertCocktail(item) {
  await query(
    "INSERT OR REPLACE INTO cocktails (id, data) VALUES (?, ?)",
    [item.id, JSON.stringify(item)]
  );
}

// --- API ---
/** Return all cocktails (array) */
export async function getAllCocktails() {
  return await readAll();
}

/** Get single cocktail by id (number) */
export async function getCocktailById(id) {
  const res = await query("SELECT data FROM cocktails WHERE id = ?", [id]);
  if (res.rows.length === 0) return null;
  return JSON.parse(res.rows.item(0).data);
}

/** Add new cocktail, returns created cocktail */
export async function addCocktail(cocktail) {
  const item = sanitizeCocktail({ ...cocktail, id: cocktail?.id ?? genId() });
  await upsertCocktail(item);
  return item;
}

/** Update existing (upsert). Returns updated cocktail */
export async function saveCocktail(updated) {
  const item = sanitizeCocktail(updated);
  await upsertCocktail(item);
  return item;
}

export function updateCocktailById(list, updated) {
  const index = list.findIndex((c) => c.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

/** Delete by id */
export async function deleteCocktail(id) {
  await query("DELETE FROM cocktails WHERE id = ?", [id]);
}

export function removeCocktail(list, id) {
  return list.filter((item) => item.id !== id);
}

/** Replace whole storage (use carefully) */
export async function replaceAllCocktails(cocktails) {
  const normalized = Array.isArray(cocktails)
    ? cocktails.map(sanitizeCocktail)
    : [];
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM cocktails");
    for (const item of normalized) {
      await db.runAsync(
        "INSERT OR REPLACE INTO cocktails (id, data) VALUES (?, ?)",
        [item.id, JSON.stringify(item)]
      );
    }
  });
  return normalized;
}

/** Simple search by name substring (case-insensitive) */
export async function searchCocktails(query) {
  const q = normalizeSearch(String(query || "").trim());
  if (!q) return getAllCocktails();
  const list = await readAll();
  return list.filter((c) => normalizeSearch(c.name).includes(q));
}

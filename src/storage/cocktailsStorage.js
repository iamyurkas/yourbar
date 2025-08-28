// src/storage/cocktailsStorage.js
import { normalizeSearch } from "../utils/normalizeSearch";
import { sortByName } from "../utils/sortByName";
import db, { query } from "./sqlite";

// --- utils ---

const now = () => Date.now();
const genId = () => now(); // сумісно з твоїми екранами (Date.now())

const sanitizeIngredient = (r, idx) => ({
  order: Number(r?.order ?? idx + 1),
  ingredientId: r?.ingredientId != null ? Number(r.ingredientId) : null, // може бути null для фрітекасту
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
  const res = await query(
    `SELECT id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt FROM cocktails`
  );
  const cocktails = res.rows._array.map((r) => ({
    id: r.id,
    name: r.name,
    photoUri: r.photoUri,
    glassId: r.glassId,
    rating: r.rating ?? 0,
    tags: r.tags ? JSON.parse(r.tags) : [],
    description: r.description ?? "",
    instructions: r.instructions ?? "",
    ingredients: [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  const map = new Map(cocktails.map((c) => [c.id, c]));
  const ingRes = await query(
    `SELECT cocktailId, orderNum, ingredientId, name, amount, unitId, garnish, optional,
            allowBaseSubstitution, allowBrandedSubstitutes, substitutes
       FROM cocktail_ingredients ORDER BY cocktailId, orderNum`
  );
  for (const r of ingRes.rows._array) {
    const c = map.get(r.cocktailId);
    if (c) {
      c.ingredients.push({
        order: r.orderNum,
        ingredientId: r.ingredientId != null ? Number(r.ingredientId) : null,
        name: r.name,
        amount: r.amount,
        unitId: r.unitId,
        garnish: !!r.garnish,
        optional: !!r.optional,
        allowBaseSubstitution: !!r.allowBaseSubstitution,
        allowBrandedSubstitutes: !!r.allowBrandedSubstitutes,
        substitutes: r.substitutes ? JSON.parse(r.substitutes) : [],
      });
    }
  }
  return Array.from(map.values()).sort(sortByName);
}

async function upsertCocktail(item) {
  // Use an exclusive transaction so all queries share the same
  // connection and SQLite can serialize writes without locking errors.
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT OR REPLACE INTO cocktails (
        id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.photoUri ?? null,
        item.glassId ?? null,
        item.rating ?? 0,
        item.tags ? JSON.stringify(item.tags) : null,
        item.description ?? null,
        item.instructions ?? null,
        item.createdAt ?? null,
        item.updatedAt ?? null,
      ]
    );
    await tx.runAsync(`DELETE FROM cocktail_ingredients WHERE cocktailId = ?`, [
      item.id,
    ]);
    for (const ing of item.ingredients) {
      await tx.runAsync(
        `INSERT INTO cocktail_ingredients (
          cocktailId, orderNum, ingredientId, name, amount, unitId, garnish, optional,
          allowBaseSubstitution, allowBrandedSubstitutes, substitutes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          ing.order,
          ing.ingredientId != null ? String(ing.ingredientId) : null,
          ing.name ?? null,
          ing.amount ?? null,
          ing.unitId ?? null,
          ing.garnish ? 1 : 0,
          ing.optional ? 1 : 0,
          ing.allowBaseSubstitution ? 1 : 0,
          ing.allowBrandedSubstitutes ? 1 : 0,
          ing.substitutes ? JSON.stringify(ing.substitutes) : null,
        ]
      );
    }
  });
}

// --- API ---
/** Return all cocktails (array) */
export async function getAllCocktails() {
  return await readAll();
}

/** Get single cocktail by id (number) */
export async function getCocktailById(id) {
  const res = await query(
    `SELECT id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt FROM cocktails WHERE id = ?`,
    [id]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows.item(0);
  const cocktail = {
    id: row.id,
    name: row.name,
    photoUri: row.photoUri,
    glassId: row.glassId,
    rating: row.rating ?? 0,
    tags: row.tags ? JSON.parse(row.tags) : [],
    description: row.description ?? "",
    instructions: row.instructions ?? "",
    ingredients: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  const ingRes = await query(
    `SELECT orderNum, ingredientId, name, amount, unitId, garnish, optional,
            allowBaseSubstitution, allowBrandedSubstitutes, substitutes
       FROM cocktail_ingredients WHERE cocktailId = ? ORDER BY orderNum`,
    [id]
  );
  cocktail.ingredients = ingRes.rows._array.map((r) => ({
    order: r.orderNum,
    ingredientId: r.ingredientId != null ? Number(r.ingredientId) : null,
    name: r.name,
    amount: r.amount,
    unitId: r.unitId,
    garnish: !!r.garnish,
    optional: !!r.optional,
    allowBaseSubstitution: !!r.allowBaseSubstitution,
    allowBrandedSubstitutes: !!r.allowBrandedSubstitutes,
    substitutes: r.substitutes ? JSON.parse(r.substitutes) : [],
  }));
  return cocktail;
}

/** Add new cocktail, returns created cocktail */
export async function addCocktail(cocktail) {
  const item = sanitizeCocktail({ ...cocktail, id: cocktail?.id ?? genId() });
  console.log("[cocktailsStorage] addCocktail", item);
  await upsertCocktail(item);
  // reading back immediately after a transaction may keep the SQLite
  // connection locked on some platforms, causing "database is locked"
  // errors. The `item` object already reflects the data that was
  // persisted, so we return it directly instead of querying again.
  console.log("[cocktailsStorage] addCocktail stored", item);
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
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM cocktail_ingredients WHERE cocktailId = ?", [id]);
    await db.runAsync("DELETE FROM cocktails WHERE id = ?", [id]);
  });
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
    await db.runAsync("DELETE FROM cocktail_ingredients");
    await db.runAsync("DELETE FROM cocktails");
    for (const item of normalized) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cocktails (
          id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.photoUri ?? null,
          item.glassId ?? null,
          item.rating ?? 0,
          item.tags ? JSON.stringify(item.tags) : null,
          item.description ?? null,
          item.instructions ?? null,
          item.createdAt ?? null,
          item.updatedAt ?? null,
        ]
      );
      for (const ing of item.ingredients) {
        await db.runAsync(
          `INSERT INTO cocktail_ingredients (
            cocktailId, orderNum, ingredientId, name, amount, unitId, garnish, optional,
            allowBaseSubstitution, allowBrandedSubstitutes, substitutes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            ing.order,
            ing.ingredientId != null ? String(ing.ingredientId) : null,
            ing.name ?? null,
            ing.amount ?? null,
            ing.unitId ?? null,
            ing.garnish ? 1 : 0,
            ing.optional ? 1 : 0,
            ing.allowBaseSubstitution ? 1 : 0,
            ing.allowBrandedSubstitutes ? 1 : 0,
            ing.substitutes ? JSON.stringify(ing.substitutes) : null,
          ]
        );
      }
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

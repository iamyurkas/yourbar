// src/storage/cocktailsStorage.js
import { normalizeSearch } from "../utils/normalizeSearch";
import { sortByName } from "../utils/sortByName";
import { CocktailRecord } from "./types";
import db, {
  query,
  initDatabase,
  withWriteTransactionAsync,
} from "./sqlite";

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

async function readAll(): Promise<CocktailRecord[]> {
  await initDatabase();
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
  const map = new Map<number, any>(cocktails.map((c) => [c.id, c]));
  const ingRes = await query(
    `SELECT cocktailId, orderNum, ingredientId, name, amount, unitId, garnish, optional,
            allowBaseSubstitution, allowBrandedSubstitutes, substitutes
       FROM cocktail_ingredients ORDER BY cocktailId, orderNum`
  );
    for (const r of ingRes.rows._array) {
      const c: any = map.get(r.cocktailId);
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
  return Array.from(map.values()).sort(sortByName) as CocktailRecord[];
}

async function upsertCocktail(item: any): Promise<void> {
  await initDatabase();
   await withWriteTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT OR REPLACE INTO cocktails (
          id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.name,
      item.photoUri ?? null,
      item.glassId ?? null,
      item.rating ?? 0,
      item.tags ? JSON.stringify(item.tags) : null,
      item.description ?? null,
      item.instructions ?? null,
      item.createdAt ?? null,
      item.updatedAt ?? null
    );
    await tx.runAsync(
      `DELETE FROM cocktail_ingredients WHERE cocktailId = ?`,
      [item.id]
    );
    if (item.ingredients.length) {
      const placeholders = item.ingredients
        .map(() =>
          "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .join(", ");
      const params = item.ingredients.flatMap((ing) => [
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
      ]);
      await tx.runAsync(
        `INSERT INTO cocktail_ingredients (
            cocktailId, orderNum, ingredientId, name, amount, unitId, garnish, optional,
            allowBaseSubstitution, allowBrandedSubstitutes, substitutes
          ) VALUES ${placeholders}`,
        params
      );
    }
  });
}

// --- API ---
/** Return all cocktails (array) */
export async function getAllCocktails(): Promise<CocktailRecord[]> {
  return await readAll();
}

/** Get single cocktail by id (number) */
export async function getCocktailById(id: number): Promise<CocktailRecord | undefined> {
  await initDatabase();
  const res = await query(
    `SELECT id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt FROM cocktails WHERE id = ?`,
    [id]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows.item(0);
  const cocktail: any = {
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
  return cocktail as CocktailRecord;
}

/** Add new cocktail, returns created cocktail */
export async function addCocktail(
  cocktail: CocktailRecord
): Promise<CocktailRecord> {
  const item = sanitizeCocktail({ ...cocktail, id: cocktail?.id ?? genId() });
  await upsertCocktail(item);
  return item as unknown as CocktailRecord;
}

/** Update existing (upsert). Returns updated cocktail */
export async function saveCocktail(
  updated: CocktailRecord
): Promise<CocktailRecord> {
  await initDatabase();
  const item = sanitizeCocktail(updated);
  await upsertCocktail(item);
  return item as unknown as CocktailRecord;
}

export function updateCocktailById(list: CocktailRecord[], updated: CocktailRecord): CocktailRecord[] {
  const index = list.findIndex((c) => c.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

/** Delete by id */
export async function deleteCocktail(id: number): Promise<void> {
  await initDatabase();
  await withWriteTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM cocktail_ingredients WHERE cocktailId = ?", id);
    await tx.runAsync("DELETE FROM cocktails WHERE id = ?", id);
  });
}

export function removeCocktail(list: CocktailRecord[], id: number): CocktailRecord[] {
  return list.filter((item) => item.id !== id);
}

/** Replace whole storage (use carefully) */
export async function replaceAllCocktails(
  cocktails: CocktailRecord[],
  tx?: any
): Promise<CocktailRecord[]> {
  const normalized = Array.isArray(cocktails)
    ? cocktails.map(sanitizeCocktail)
    : [];
  await initDatabase();
  const run = async (innerTx) => {
    await innerTx.runAsync("DELETE FROM cocktail_ingredients");
    await innerTx.runAsync("DELETE FROM cocktails");
    if (normalized.length) {
      const cocktailPlaceholders = normalized
        .map(() =>
          "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .join(", ");
      const cocktailParams = normalized.flatMap((item) => [
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
      ]);
      await innerTx.runAsync(
        `INSERT OR REPLACE INTO cocktails (
            id, name, photoUri, glassId, rating, tags, description, instructions, createdAt, updatedAt
          ) VALUES ${cocktailPlaceholders}`,
        cocktailParams
      );
      const allIngredients = normalized.flatMap((item) =>
        item.ingredients.map((ing) => ({ ...ing, cocktailId: item.id }))
      );
      if (allIngredients.length) {
        const ingPlaceholders = allIngredients
          .map(() =>
            "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .join(", ");
        const ingParams = allIngredients.flatMap((ing) => [
          ing.cocktailId,
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
        ]);
        await innerTx.runAsync(
          `INSERT INTO cocktail_ingredients (
            cocktailId, orderNum, ingredientId, name, amount, unitId, garnish, optional,
            allowBaseSubstitution, allowBrandedSubstitutes, substitutes
          ) VALUES ${ingPlaceholders}`,
          ingParams
        );
      }
    }
  };
  if (tx) {
    await run(tx);
  } else {
    await withWriteTransactionAsync(run);
  }
    return normalized as unknown as CocktailRecord[];
  }

/** Simple search by name substring (case-insensitive) */
export async function searchCocktails(query: string): Promise<CocktailRecord[]> {
  const q = normalizeSearch(String(query || "").trim());
  if (!q) return getAllCocktails();
  const list = await readAll();
  return list.filter((c) => normalizeSearch(c.name).includes(q));
}

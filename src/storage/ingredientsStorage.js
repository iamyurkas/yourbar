import { query, initDatabase, withExclusiveWriteAsync } from "./sqlite";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import { sortByName } from "../utils/sortByName";

const now = () => Date.now();
const genId = () => now();

export async function getAllIngredients() {
  console.log("[ingredientsStorage] getAllIngredients start");
  await initDatabase();
  const res = await query(
    "SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients"
  );
  const list = res.rows._array
    .map((r) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description,
      tags: r.tags ? JSON.parse(r.tags) : [],
      baseIngredientId: r.baseIngredientId != null ? Number(r.baseIngredientId) : null,
      usageCount: r.usageCount ?? 0,
      singleCocktailName: r.singleCocktailName,
      searchName: r.searchName,
      searchTokens: r.searchTokens ? JSON.parse(r.searchTokens) : [],
      photoUri: r.photoUri,
      inBar: !!r.inBar,
      inShoppingList: !!r.inShoppingList,
    }))
    .sort(sortByName);
  console.log("[ingredientsStorage] getAllIngredients rows", list.length);
  return list;
}

export async function getIngredientsByIds(ids) {
  const list = Array.isArray(ids) ? ids.filter((id) => id != null) : [];
  if (list.length === 0) return [];
  const placeholders = list.map(() => "?").join(", ");
  await initDatabase();
  const res = await query(
    `SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients WHERE id IN (${placeholders})`,
    list.map((id) => String(id))
  );
  const rows = res.rows._array
    .map((r) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description,
      tags: r.tags ? JSON.parse(r.tags) : [],
      baseIngredientId: r.baseIngredientId != null ? Number(r.baseIngredientId) : null,
      usageCount: r.usageCount ?? 0,
      singleCocktailName: r.singleCocktailName,
      searchName: r.searchName,
      searchTokens: r.searchTokens ? JSON.parse(r.searchTokens) : [],
      photoUri: r.photoUri,
      inBar: !!r.inBar,
      inShoppingList: !!r.inShoppingList,
    }))
    .sort(sortByName);
  console.log("[ingredientsStorage] getIngredientsByIds rows", rows.length, "ids", list.map(String));
  return rows;
}

export async function getIngredientsByBaseIds(baseIds, { inBarOnly = false } = {}) {
  const list = Array.isArray(baseIds) ? baseIds.filter((id) => id != null) : [];
  if (list.length === 0) return [];
  const placeholders = list.map(() => "?").join(", ");
  await initDatabase();
  const res = await query(
    `SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients WHERE baseIngredientId IN (${placeholders})${inBarOnly ? ' AND inBar = 1' : ''}`,
    list.map((id) => String(id))
  );
  const rows = res.rows._array
    .map((r) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description,
      tags: r.tags ? JSON.parse(r.tags) : [],
      baseIngredientId: r.baseIngredientId != null ? Number(r.baseIngredientId) : null,
      usageCount: r.usageCount ?? 0,
      singleCocktailName: r.singleCocktailName,
      searchName: r.searchName,
      searchTokens: r.searchTokens ? JSON.parse(r.searchTokens) : [],
      photoUri: r.photoUri,
      inBar: !!r.inBar,
      inShoppingList: !!r.inShoppingList,
    }))
    .sort(sortByName);
  console.log("[ingredientsStorage] getIngredientsByBaseIds rows", rows.length, "baseIds", list.map(String), "inBarOnly", !!inBarOnly);
  return rows;
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

async function upsertIngredient(item) {
  await initDatabase();
  await withExclusiveWriteAsync(async (tx) => {
    console.log("[ingredientsStorage] upsertIngredient start", item.id, item.name);
    await tx.runAsync(
      `INSERT OR REPLACE INTO ingredients (
        id, name, description, tags, baseIngredientId, usageCount,
        singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      String(item.id),
      item.name ?? null,
      item.description ?? null,
      item.tags ? JSON.stringify(item.tags) : null,
      item.baseIngredientId ?? null,
      item.usageCount ?? 0,
      item.singleCocktailName ?? null,
      item.searchName ?? null,
      item.searchTokens ? JSON.stringify(item.searchTokens) : null,
      item.photoUri ?? null,
      item.inBar ? 1 : 0,
      item.inShoppingList ? 1 : 0
    );
    console.log("[ingredientsStorage] upsertIngredient done", item.id);
  });
}

export async function saveAllIngredientsTx(tx, ingredients) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  console.log("[ingredientsStorage] saveAllIngredients start", list.length);
  await tx.runAsync("DELETE FROM ingredients");
  for (const item of list) {
    await tx.runAsync(
      `INSERT OR REPLACE INTO ingredients (
          id, name, description, tags, baseIngredientId, usageCount,
          singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      String(item.id),
      item.name ?? null,
      item.description ?? null,
      item.tags ? JSON.stringify(item.tags) : null,
      item.baseIngredientId ?? null,
      item.usageCount ?? 0,
      item.singleCocktailName ?? null,
      item.searchName ?? null,
      item.searchTokens ? JSON.stringify(item.searchTokens) : null,
      item.photoUri ?? null,
      item.inBar ? 1 : 0,
      item.inShoppingList ? 1 : 0
    );
  }
  console.log("[ingredientsStorage] saveAllIngredients done");
}

export async function saveAllIngredients(ingredients) {
  await initDatabase();
  await withExclusiveWriteAsync(async (tx) => {
    await saveAllIngredientsTx(tx, ingredients);
  });
}

export function updateIngredientById(map, updated) {
  const prev = map.get(updated.id);
  if (!prev) return map;
  const next = new Map(map);
  next.set(updated.id, { ...prev, ...updated });
  return next;
}

function sanitizeIngredient(i) {
  const id = Number(i?.id ?? genId());
  const name = String(i?.name ?? "").trim();
  const searchName = normalizeSearch(name);
  const searchTokens = searchName.split(WORD_SPLIT_RE).filter(Boolean);
  return {
    id,
    name,
    description: i?.description ?? null,
    tags: Array.isArray(i?.tags) ? i.tags : [],
    baseIngredientId: i?.baseIngredientId ?? null,
    usageCount: Number(i?.usageCount ?? 0),
    singleCocktailName: i?.singleCocktailName ?? null,
    searchName,
    searchTokens,
    photoUri: i?.photoUri ?? null,
    inBar: !!i?.inBar,
    inShoppingList: !!i?.inShoppingList,
  };
}

export async function addIngredient(ingredient) {
  const item = sanitizeIngredient({ ...ingredient, id: ingredient?.id ?? genId() });
  await upsertIngredient(item);
  return item;
}

export async function saveIngredient(updated) {
  await initDatabase();
  if (!updated?.id) return;
  const name = String(updated.name ?? "").trim();
  const searchName = normalizeSearch(name);
  let item;
  if (
    updated.searchName === searchName &&
    Array.isArray(updated.searchTokens)
  ) {
    item = {
      id: Number(updated.id),
      name,
      description: updated.description ?? null,
      tags: Array.isArray(updated.tags) ? updated.tags : [],
      baseIngredientId: updated.baseIngredientId ?? null,
      usageCount: Number(updated.usageCount ?? 0),
      singleCocktailName: updated.singleCocktailName ?? null,
      searchName,
      searchTokens: updated.searchTokens,
      photoUri: updated.photoUri ?? null,
      inBar: !!updated.inBar,
      inShoppingList: !!updated.inShoppingList,
    };
  } else {
    item = sanitizeIngredient({ ...updated, name });
  }
  await upsertIngredient(item);
  console.log("[ingredientsStorage] saveIngredient stored", item.id, item.name);
  return item;
}

export async function updateIngredientFields(id, fields) {
  await initDatabase();
  if (!id || !fields || typeof fields !== "object") return;
  const entries = Object.entries(fields);
  if (!entries.length) return;

  const converters = {
    name: (v) => v ?? null,
    description: (v) => v ?? null,
    tags: (v) => (v ? JSON.stringify(v) : null),
    baseIngredientId: (v) => v ?? null,
    usageCount: (v) => Number(v ?? 0),
    singleCocktailName: (v) => v ?? null,
    searchName: (v) => v ?? null,
    searchTokens: (v) => (v ? JSON.stringify(v) : null),
    photoUri: (v) => v ?? null,
    inBar: (v) => (v ? 1 : 0),
    inShoppingList: (v) => (v ? 1 : 0),
  };

  const parts = [];
  const params = [];
  for (const [key, value] of entries) {
    if (converters[key]) {
      parts.push(`${key} = ?`);
      params.push(converters[key](value));
    }
  }
  if (!parts.length) return;
  params.push(String(id));
  const sql = `UPDATE ingredients SET ${parts.join(", ")} WHERE id = ?`;
  await withExclusiveWriteAsync(async (tx) => {
    await tx.runAsync(sql, params);
  });
  console.log("[ingredientsStorage] updateIngredientFields", id, Object.keys(fields));
}

export async function flushPendingIngredients(list) {
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return;
  await initDatabase();
  await withExclusiveWriteAsync(async (tx) => {
    console.log("[ingredientsStorage] flushPendingIngredients start", items.length);
    for (const u of items) {
      const item = sanitizeIngredient(u);
      await tx.runAsync(
        `INSERT OR REPLACE INTO ingredients (
          id, name, description, tags, baseIngredientId, usageCount,
          singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        String(item.id),
        item.name ?? null,
        item.description ?? null,
        item.tags ? JSON.stringify(item.tags) : null,
        item.baseIngredientId ?? null,
        item.usageCount ?? 0,
        item.singleCocktailName ?? null,
        item.searchName ?? null,
        item.searchTokens ? JSON.stringify(item.searchTokens) : null,
        item.photoUri ?? null,
        item.inBar ? 1 : 0,
        item.inShoppingList ? 1 : 0
      );
    }
    console.log("[ingredientsStorage] flushPendingIngredients done");
  });
}

export function getIngredientById(id, index) {
  return index ? index[id] : null;
}

export async function deleteIngredient(id) {
  await initDatabase();
  await withExclusiveWriteAsync(async (tx) => {
    await tx.runAsync("DELETE FROM ingredients WHERE id = ?", [String(id)]);
  });
  console.log("[ingredientsStorage] deleteIngredient", String(id));
}

export function removeIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

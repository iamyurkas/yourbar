import db, { query } from "./sqlite";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../utils/wordPrefixMatch";
import { sortByName } from "../utils/sortByName";

const now = () => Date.now();
const genId = () => now();

export async function getAllIngredients() {
  const res = await query(
    "SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients"
  );
  return res.rows._array
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
}

export async function getIngredientsByIds(ids) {
  const list = Array.isArray(ids) ? ids.filter((id) => id != null) : [];
  if (list.length === 0) return [];
  const placeholders = list.map(() => "?").join(", ");
  const res = await query(
    `SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients WHERE id IN (${placeholders})`,
    list.map((id) => String(id))
  );
  return res.rows._array
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
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

async function upsertIngredient(item) {
  await query(
    `INSERT OR REPLACE INTO ingredients (
      id, name, description, tags, baseIngredientId, usageCount,
      singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
      item.inShoppingList ? 1 : 0,
    ]
  );
}

export async function saveAllIngredients(ingredients) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM ingredients");
    for (const item of list) {
      await db.runAsync(
        `INSERT OR REPLACE INTO ingredients (
          id, name, description, tags, baseIngredientId, usageCount,
          singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          item.inShoppingList ? 1 : 0,
        ]
      );
    }
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
  if (!updated?.id) return;
  const item = sanitizeIngredient(updated);
  await upsertIngredient(item);
  return item;
}

export function getIngredientById(id, index) {
  return index ? index[id] : null;
}

export async function deleteIngredient(id) {
  await query("DELETE FROM ingredients WHERE id = ?", [String(id)]);
}

export function removeIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

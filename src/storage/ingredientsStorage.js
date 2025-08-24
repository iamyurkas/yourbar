import db, { query } from "./sqlite";

export async function getAllIngredients() {
  const res = await query(
    "SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients"
  );
  return res.rows._array.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    tags: r.tags ? JSON.parse(r.tags) : [],
    baseIngredientId: r.baseIngredientId,
    usageCount: r.usageCount ?? 0,
    singleCocktailName: r.singleCocktailName,
    searchName: r.searchName,
    searchTokens: r.searchTokens ? JSON.parse(r.searchTokens) : [],
    photoUri: r.photoUri,
    inBar: !!r.inBar,
    inShoppingList: !!r.inShoppingList,
  }));
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

export function updateIngredientById(list, updated) {
  const index = list.findIndex((i) => i.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export async function saveIngredient(item) {
  if (item && item.id != null) {
    await upsertIngredient(item);
  }
}

export function addIngredient(list, ingredient) {
  return [
    ...list,
    {
      ...ingredient,
      inBar: false,
      inShoppingList: false,
      baseIngredientId: ingredient.baseIngredientId ?? null,
    },
  ];
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

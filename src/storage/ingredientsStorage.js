import db, { query } from "./sqlite";

export async function getAllIngredients() {
  const res = await query("SELECT data FROM ingredients");
  return res.rows._array.map((r) => JSON.parse(r.data));
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

async function upsertIngredient(item) {
  await query(
    "INSERT OR REPLACE INTO ingredients (id, data) VALUES (?, ?)",
    [String(item.id), JSON.stringify(item)]
  );
}

export async function saveAllIngredients(ingredients) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM ingredients");
    for (const item of list) {
      await db.runAsync(
        "INSERT OR REPLACE INTO ingredients (id, data) VALUES (?, ?)",
        [String(item.id), JSON.stringify(item)]
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

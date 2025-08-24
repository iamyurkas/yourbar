import db, { initDatabase, query } from "./sqlite";

initDatabase();

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

export async function saveAllIngredients(ingredients) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  db.transaction((tx) => {
    tx.executeSql("DELETE FROM ingredients");
    list.forEach((item) => {
      tx.executeSql(
        "INSERT OR REPLACE INTO ingredients (id, data) VALUES (?, ?)",
        [String(item.id), JSON.stringify(item)]
      );
    });
  });
}

export function updateIngredientById(list, updated) {
  const index = list.findIndex((i) => i.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export async function saveIngredient(updatedList) {
  await saveAllIngredients(updatedList);
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

export function deleteIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

let data;
export function __setDataLayer(mock) {
  data = mock;
}
async function ensure() {
  if (!data) {
    data = await import("../data/ingredients.js");
  }
  return data;
}

/** Domain-level services for ingredients */
export async function getAllIngredients() {
  return (await ensure()).getAllIngredients();
}
export async function getIngredientsByIds(ids) {
  return (await ensure()).getIngredientsByIds(ids);
}
export async function getIngredientsByBaseIds(baseIds, opts) {
  return (await ensure()).getIngredientsByBaseIds(baseIds, opts);
}
export async function saveAllIngredients(ingredients, tx) {
  return (await ensure()).saveAllIngredients(ingredients, tx);
}
export async function addIngredient(ingredient) {
  return (await ensure()).addIngredient(ingredient);
}
export async function saveIngredient(updated) {
  return (await ensure()).saveIngredient(updated);
}
export async function updateIngredientFields(id, fields) {
  return (await ensure()).updateIngredientFields(id, fields);
}
export async function flushPendingIngredients(list) {
  return (await ensure()).flushPendingIngredients(list);
}
export async function toggleIngredientsInBar(ids) {
  return (await ensure()).toggleIngredientsInBar(ids);
}
export async function deleteIngredient(id) {
  return (await ensure()).deleteIngredient(id);
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}
export function updateIngredientById(map, updated) {
  const prev = map.get(updated.id);
  if (!prev) return map;
  const next = new Map(map);
  next.set(updated.id, { ...prev, ...updated });
  return next;
}
export function getIngredientById(id, index) {
  return index ? index[id] : null;
}
export function removeIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

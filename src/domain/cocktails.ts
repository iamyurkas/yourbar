let data;
export function __setDataLayer(mock) {
  data = mock;
}
async function ensure() {
  if (!data) {
    data = await import("../data/cocktails");
  }
  return data;
}

/** Domain-level services for cocktails */
export async function getAllCocktails() {
  return (await ensure()).getAllCocktails();
}
export async function getCocktailById(id) {
  return (await ensure()).getCocktailById(id);
}
export async function addCocktail(cocktail) {
  return (await ensure()).addCocktail(cocktail);
}
export async function saveCocktail(updated) {
  return (await ensure()).saveCocktail(updated);
}
export async function deleteCocktail(id) {
  return (await ensure()).deleteCocktail(id);
}
export async function replaceAllCocktails(cocktails, tx) {
  return (await ensure()).replaceAllCocktails(cocktails, tx);
}
export async function searchCocktails(query) {
  return (await ensure()).searchCocktails(query);
}

export function updateCocktailById(list, updated) {
  const index = list.findIndex((c) => c.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}
export function removeCocktail(list, id) {
  return list.filter((item) => item.id !== id);
}

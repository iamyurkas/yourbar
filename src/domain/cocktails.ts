import { updateArrayItemsById } from "../utils/updateCollections";

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
  return updateArrayItemsById(list, updated);
}
export function removeCocktail(list, id) {
  return list.filter((item) => item.id !== id);
}

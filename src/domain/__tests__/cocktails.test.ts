import test from "node:test";
import assert from "node:assert/strict";
import { __setDataLayer, getAllCocktails } from "../cocktails";

test("getAllCocktails returns an array", async () => {
  __setDataLayer({ getAllCocktails: async () => [] });
  const result = await getAllCocktails();
  assert.ok(Array.isArray(result));
});

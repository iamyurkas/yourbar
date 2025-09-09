import test from "node:test";
import assert from "node:assert/strict";
import { __setDataLayer, getAllIngredients } from "../ingredients.js";

test("getAllIngredients returns an array", async () => {
  __setDataLayer({ getAllIngredients: async () => [] });
  const result = await getAllIngredients();
  assert.ok(Array.isArray(result));
});

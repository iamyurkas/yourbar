import test from "node:test";
import assert from "node:assert/strict";
import ingredientFlagsStore, {
  __resetIngredientFlagsStore,
  setPersistenceWriter,
  toggleInBar,
  toggleInShopping,
} from "../ingredients.store";

test("toggleInBar updates state and flushes batch", async () => {
  __resetIngredientFlagsStore();
  const updates: Array<any> = [];
  setPersistenceWriter(async (batch) => {
    updates.push(batch);
  });
  ingredientFlagsStore.getState().bulkApplyFlags(
    new Map([["1", { inBar: false, inShopping: false }]])
  );
  toggleInBar("1");
  assert.equal(ingredientFlagsStore.getState().inBarMap["1"], true);
  await ingredientFlagsStore.getState().flushPendingWrites();
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], [{ id: "1", inBar: true }]);
});

test("multiple toggles collapse into final state", async () => {
  __resetIngredientFlagsStore();
  let calls = 0;
  setPersistenceWriter(async () => {
    calls += 1;
  });
  ingredientFlagsStore.getState().bulkApplyFlags(
    new Map([["5", { inBar: false, inShopping: false }]])
  );
  toggleInBar("5");
  toggleInBar("5");
  toggleInShopping("5");
  assert.equal(ingredientFlagsStore.getState().inBarMap["5"], false);
  assert.equal(ingredientFlagsStore.getState().inShoppingMap["5"], true);
  await ingredientFlagsStore.getState().flushPendingWrites();
  assert.equal(calls, 1);
});


import test from "node:test";
import assert from "node:assert/strict";
import { groupIngredientsByTag } from "../groupIngredientsByTag.js";

test("groups ingredients by tag and sorts by name", () => {
  const ingredients = [
    { id: 1, name: "B", tags: [{ id: 1 }, { id: 2 }] },
    { id: 2, name: "A", tags: [{ id: 1 }] },
    { id: 3, name: "C" },
  ];
  const tags = [{ id: 1 }, { id: 2 }];
  const map = groupIngredientsByTag(ingredients, tags);
  assert.deepEqual(
    map.get(1).map((i) => i.name),
    ["A", "B"],
  );
  assert.deepEqual(map.get(2).map((i) => i.name), ["B"]);
});

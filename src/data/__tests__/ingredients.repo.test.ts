import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFlagsBatch,
  getFlags,
  __setDbAdapters,
} from "../ingredients.repo";
import { runRead, runTransaction } from "../db";

test("applyFlagsBatch generates targeted updates", async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  __setDbAdapters({
    transaction: async (work) => {
      return work({
        runAsync: async (sql: string, params: unknown[]) => {
          statements.push({ sql, params });
        },
        execAsync: async () => {},
      } as any);
    },
  });
  await applyFlagsBatch([
    { id: "abc", inBar: true },
    { id: "def", inShopping: false },
  ]);
  assert.equal(statements.length, 4);
  assert.match(statements[0].sql, /UPDATE ingredients SET in_bar = \?/);
  assert.deepEqual(statements[0].params, [1, "abc"]);
  assert.match(statements[1].sql, /INSERT INTO events/);
  assert.match(statements[2].sql, /UPDATE ingredients SET in_shopping = \?/);
  assert.deepEqual(statements[2].params, [0, "def"]);
  __setDbAdapters({ transaction: runTransaction });
});

test("getFlags returns normalized map", async () => {
  __setDbAdapters({
    read: async () =>
      [
        { id: "x", in_bar: 1, in_shopping: 0 },
        { id: "y", in_bar: 0, in_shopping: 1 },
      ] as any,
  });
  const result = await getFlags(["x", "y"]);
  assert.deepEqual(result, {
    x: { inBar: true, inShopping: false },
    y: { inBar: false, inShopping: true },
  });
  __setDbAdapters({ read: runRead });
});


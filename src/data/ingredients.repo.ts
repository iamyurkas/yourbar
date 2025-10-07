import { runRead, runTransaction } from "./db";

export type IngredientFlagRecord = {
  id: string;
  inBar: boolean;
  inShopping: boolean;
};

export type IngredientFlagUpdate = {
  id: string;
  inBar?: boolean;
  inShopping?: boolean;
};

let runReadImpl = runRead;
let runTransactionImpl = runTransaction;

export function __setDbAdapters({
  read,
  transaction,
}: {
  read?: typeof runRead;
  transaction?: typeof runTransaction;
}) {
  if (read) runReadImpl = read;
  if (transaction) runTransactionImpl = transaction;
}

export async function getFlags(
  ids: string[]
): Promise<Record<string, { inBar: boolean; inShopping: boolean }>> {
  if (!ids.length) return {};
  const placeholders = ids.map(() => "?").join(",");
  const rows = await runReadImpl<{
    id: string;
    in_bar: number;
    in_shopping: number;
  }>(
    `SELECT id,
            COALESCE(in_bar, inBar, 0)   AS in_bar,
            COALESCE(in_shopping, inShoppingList, 0) AS in_shopping
       FROM ingredients
      WHERE id IN (${placeholders})`,
    ids
  );
  const result: Record<string, { inBar: boolean; inShopping: boolean }> = {};
  for (const row of rows) {
    result[row.id] = {
      inBar: !!row.in_bar,
      inShopping: !!row.in_shopping,
    };
  }
  return result;
}

export async function applyFlagsBatch(updates: IngredientFlagUpdate[]) {
  if (!updates.length) return;
  await runTransactionImpl(async (db) => {
    for (const update of updates) {
      const assignments: string[] = [];
      const params: Array<string | number> = [];
      if (typeof update.inBar === "boolean") {
        assignments.push("in_bar = ?", "inBar = ?");
        const value = update.inBar ? 1 : 0;
        params.push(value, value);
      }
      if (typeof update.inShopping === "boolean") {
        assignments.push("in_shopping = ?", "inShoppingList = ?");
        const value = update.inShopping ? 1 : 0;
        params.push(value, value);
      }
      if (!assignments.length) continue;
      params.push(update.id);
      await db.runAsync(
        `UPDATE ingredients SET ${assignments.join(", ")} WHERE id = ?`,
        params
      );
      await db.runAsync(
        `INSERT INTO events (t, type, ingredient_id, payload) VALUES (strftime('%s','now'), ?, ?, ?)` ,
        [
          "flags.update",
          update.id,
          JSON.stringify({ inBar: update.inBar, inShopping: update.inShopping }),
        ]
      );
    }
  });
}

export async function appendEvent(type: string, ingredientId: string, payload: unknown) {
  await runTransactionImpl(async (db) => {
    await db.runAsync(
      `INSERT INTO events (t, type, ingredient_id, payload) VALUES (strftime('%s','now'), ?, ?, ?)` ,
      [type, ingredientId, JSON.stringify(payload ?? null)]
    );
  });
}


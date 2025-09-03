import * as SQLite from "expo-sqlite";
import { beforeRead, afterRead } from "./importLock";

// Initialize and export a shared SQLite instance for the app.
const db = SQLite.openDatabaseSync("yourbar.db");

let initPromise;
let writeQueue = Promise.resolve();

export function initDatabase() {
  if (!initPromise) {
    initPromise = db.execAsync(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS cocktails (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT,
        photoUri TEXT,
        glassId TEXT,
        rating INTEGER,
        tags TEXT,
        description TEXT,
        instructions TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS cocktail_ingredients (
        cocktailId INTEGER NOT NULL,
        orderNum INTEGER,
        ingredientId TEXT,
        name TEXT,
        amount TEXT,
        unitId INTEGER,
        garnish INTEGER,
        optional INTEGER,
        allowBaseSubstitution INTEGER,
        allowBrandedSubstitutes INTEGER,
        substitutes TEXT,
        PRIMARY KEY (cocktailId, orderNum),
        FOREIGN KEY (cocktailId) REFERENCES cocktails(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        description TEXT,
        tags TEXT,
        baseIngredientId TEXT,
        usageCount INTEGER,
        singleCocktailName TEXT,
        searchName TEXT,
        searchTokens TEXT,
        photoUri TEXT,
        inBar INTEGER,
        inShoppingList INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_cocktails_name ON cocktails (name);
      CREATE INDEX IF NOT EXISTS idx_cocktail_ingredients_ingredientId ON cocktail_ingredients (ingredientId);
      CREATE INDEX IF NOT EXISTS idx_ingredients_searchName ON ingredients (searchName);
      CREATE INDEX IF NOT EXISTS idx_ingredients_inBar ON ingredients (inBar);
    `);
  }
  return initPromise;
}

export async function query(sql, params = []) {
  // assume initDatabase() has been invoked at app startup
  await initPromise;
  console.log("[sqlite] query start", sql, params);
  const trimmed = sql.trim().toLowerCase();
  if (trimmed.startsWith("select")) {
    await beforeRead();
    try {
      const rows = await db.getAllAsync(sql, params);
      console.log("[sqlite] query rows", rows.length);
      return {
        rows: {
          _array: rows,
          length: rows.length,
          item: (i) => rows[i],
        },
      };
    } finally {
      afterRead();
    }
  }
  const res = await db.runAsync(sql, params);
  console.log("[sqlite] query done");
  return res;
}

// Serialize all write operations across modules to avoid DB locked errors
export function withExclusiveWriteAsync(work) {
  if (typeof work !== "function") throw new Error("work must be a function");
  const runner = async () => {
    await initPromise;
    const wrapper = async (tx) => {
      const origRun = tx.runAsync.bind(tx);
      tx.runAsync = async (sql, ...args) => {
        console.log("[sqlite] tx.run", sql);
        return origRun(sql, ...args);
      };
      const origGet = tx.getAllAsync.bind(tx);
      tx.getAllAsync = async (sql, ...args) => {
        console.log("[sqlite] tx.getAll", sql);
        return origGet(sql, ...args);
      };
      try {
        return await work(tx);
      } finally {
        tx.runAsync = origRun;
        tx.getAllAsync = origGet;
      }
    };
    console.log("[sqlite] withExclusiveWriteAsync start");
    const result = SQLite.withExclusiveTransactionAsync
      ? await SQLite.withExclusiveTransactionAsync(db, wrapper)
      : await db.withExclusiveTransactionAsync(wrapper);
    console.log("[sqlite] withExclusiveWriteAsync end");
    return result;
  };
  const next = writeQueue.then(runner, runner);
  // Keep the chain alive even if an operation fails
  writeQueue = next.catch((e) => {
    console.warn("[sqlite] withExclusiveWriteAsync error", e);
  });
  return next;
}

export default db;


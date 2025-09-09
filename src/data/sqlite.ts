import * as SQLite from "expo-sqlite";

// Initialize and export a shared SQLite instance for the app.
const db = SQLite.openDatabaseSync("yourbar.db");

// Disable verbose SQL query logging if the tracer API is available.
if (typeof SQLite.setTracer === "function") {
  SQLite.setTracer(() => {});
}

let initPromise;
// Global mutex that serializes writes and blocks new reads while a write is
// pending.  Initialized as an already-resolved promise so `await writeLock`
// continues immediately when no write is in progress.
let writeLock = Promise.resolve();
const pendingSelects = new Set();

export function initDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      await db.execAsync("PRAGMA foreign_keys = ON;");
      try {
        await db.execAsync("PRAGMA journal_mode=WAL;");
      } catch (e) {
        console.warn("[sqlite] failed to enable WAL", e);
      }
      await db.execAsync("PRAGMA busy_timeout = 5000;");
      await db.execAsync(`
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
    })();
  }
  return initPromise;
}

export async function query(sql, params = []) {
  // assume initDatabase() has been invoked at app startup
  await initPromise;
  // Block reads while a write transaction is pending.
  await writeLock;
  const trimmed = sql.trim().toLowerCase();
  if (trimmed.startsWith("select")) {
    const promise = db.getAllAsync(sql, params);
    pendingSelects.add(promise);
    const rows = await promise.finally(() => pendingSelects.delete(promise));
    return {
      rows: {
        _array: rows,
        length: rows.length,
        item: (i) => rows[i],
      },
    };
  }
  return db.runAsync(sql, params);
}

// Serialize all write operations across modules to avoid DB locked errors
export function withWriteTransactionAsync(work) {
  if (typeof work !== "function") throw new Error("work must be a function");
  const runner = async () => {
    await initPromise;
    await waitForSelects();
    const callback = async () => work(db);
    return SQLite.withTransactionAsync
      ? SQLite.withTransactionAsync(db, callback)
      : db.withTransactionAsync(callback);
  };
  const next = writeLock.then(runner, runner);
  // Keep the chain alive even if an operation fails and unblock queued
  // reads/writes once this transaction finishes.
  writeLock = next.catch((e) => {
    console.warn("[sqlite] withWriteTransactionAsync error", e);
  });
  return next;
}

export function waitForSelects() {
  return Promise.all(Array.from(pendingSelects));
}

export default db;


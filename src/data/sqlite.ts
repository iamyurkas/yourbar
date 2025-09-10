import * as SQLite from "expo-sqlite";

// Use separate connections for reads and writes.
const readDb = SQLite.openDatabaseSync("yourbar.db");
const writeDb = SQLite.openDatabaseSync("yourbar.db");

// Log every SQL query with a timestamp (including milliseconds) if the tracer API is available.
if (typeof SQLite.setTracer === "function") {
  SQLite.setTracer((sql, params) => {
    const ts = new Date().toISOString();
    const paramsStr = params && params.length ? ` | params: ${JSON.stringify(params)}` : "";
    console.log(`[sqlite] ${ts} | query: ${sql}${paramsStr}`);
  });
}

let initPromise;
// Simple queue that serializes write transactions.
let writeQueue = Promise.resolve();

export function initDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const db of [readDb, writeDb]) {
        await db.execAsync("PRAGMA foreign_keys = ON;");
        await db.execAsync("PRAGMA busy_timeout = 5000;");
      }
      try {
        await writeDb.execAsync("PRAGMA journal_mode=WAL;");
      } catch (e) {
        console.warn("[sqlite] failed to enable WAL", e);
      }
      await writeDb.execAsync(`
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
        CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients (name);
        CREATE INDEX IF NOT EXISTS idx_ingredients_baseIngredientId ON ingredients (baseIngredientId);
      `);
    })();
  }
  return initPromise;
}

export async function query(sql, params = []) {
  await initPromise; // assume initDatabase() invoked at app startup
  const trimmed = sql.trim().toLowerCase();
  if (trimmed.startsWith("select")) {
    const rows = await readDb.getAllAsync(sql, params);
    return {
      rows: {
        _array: rows,
        length: rows.length,
        item: (i) => rows[i],
      },
    };
  }
  return withWriteTransactionAsync((db) => db.runAsync(sql, params));
}

// Serialize all write operations across modules to avoid DB locked errors
export function withWriteTransactionAsync(work) {
  if (typeof work !== "function") throw new Error("work must be a function");
  const runner = async () => {
    await initPromise;
    const callback = async () => work(writeDb);
    return SQLite.withTransactionAsync
      ? SQLite.withTransactionAsync(writeDb, callback)
      : writeDb.withTransactionAsync(callback);
  };
  const next = writeQueue.then(runner, runner);
  // Keep the chain alive even if an operation fails and unblock queued writes
  writeQueue = next.catch((e) => {
    console.warn("[sqlite] withWriteTransactionAsync error", e);
  });
  return next;
}

export default readDb;


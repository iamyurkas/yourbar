import * as SQLite from "expo-sqlite";
import { makeProfiler } from "../utils/profile";

function logWithTime(message: string, ...args: any[]) {
  console.log(`[${new Date().toISOString()}] ${message}`, ...args);
}

function warnWithTime(message: string, ...args: any[]) {
  console.warn(`[${new Date().toISOString()}] ${message}`, ...args);
}

function logQuery(sql: string, params?: any) {
  if (params === undefined || params.length === 0) {
    logWithTime(sql);
  } else {
    logWithTime(sql, params);
  }
}

function attachLogging(db: any) {
  const methods = ["execAsync", "runAsync", "getAllAsync", "getFirstAsync"] as const;
  for (const name of methods) {
    const original = db[name];
    if (typeof original === "function") {
      db[name] = (...args: any[]) => {
        const [sql, ...rest] = args;
        if (typeof sql === "string") {
          logQuery(sql, rest.length === 1 ? rest[0] : rest);
        }
        return original.apply(db, args);
      };
    }
  }
}

// Use separate connections for reads and writes.
const readDb = SQLite.openDatabaseSync("yourbar.db");
const writeDb = SQLite.openDatabaseSync("yourbar.db");

attachLogging(readDb);
attachLogging(writeDb);

// Disable verbose SQL query logging if the tracer API is available.
if (typeof SQLite.setTracer === "function") {
  SQLite.setTracer(() => {});
}

let initPromise;
// Simple queue that serializes write transactions.
let writeQueue = Promise.resolve();
let queueLength = 0;

export function initDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const db of [readDb, writeDb]) {
        await db.execAsync("PRAGMA foreign_keys = ON;");
        await db.execAsync("PRAGMA busy_timeout = 0;");
      }
      try {
        await writeDb.execAsync("PRAGMA journal_mode=WAL;");
      } catch (e) {
        warnWithTime("[sqlite] failed to enable WAL", e);
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
    const profiler = makeProfiler("[sqlite]");
    profiler.step(`tx queued. pending=${queueLength}`);

    let hasRun = false;
    let inTx = false;

    const beginTx = async () => {
      if (!inTx) {
        inTx = true;
        profiler.step("begin transaction");
        await writeDb.execAsync("BEGIN IMMEDIATE");
      }
    };

    const methods = ["runAsync", "execAsync", "getAllAsync", "getFirstAsync"];
    const tx = new Proxy(writeDb, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && methods.includes(prop)) {
          return async (...args: any[]) => {
            if (!hasRun) {
              hasRun = true;
              profiler.step(`first ${prop}`);
            }
            await beginTx();
            return (target as any)[prop](...args);
          };
        }
        const value = (target as any)[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    try {
      const result = await work(tx);
      if (inTx) {
        await writeDb.execAsync("COMMIT");
        profiler.step("COMMIT");
      }
      return result;
    } catch (e) {
      if (inTx) {
        try {
          await writeDb.execAsync("ROLLBACK");
          profiler.step("ROLLBACK");
        } catch (err) {
          warnWithTime("[sqlite] rollback error", err);
        }
      }
      throw e;
    } finally {
      profiler.step("tx finished");
    }
  };

  queueLength++;
  const next = writeQueue.then(runner, runner);
  // Keep the chain alive even if an operation fails and unblock queued writes
  writeQueue = next
    .catch((e) => {
      warnWithTime("[sqlite] withWriteTransactionAsync error", e);
    })
    .finally(() => {
      queueLength--;
    });
  return next;
}

export default readDb;


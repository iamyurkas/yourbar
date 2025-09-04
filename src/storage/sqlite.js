import * as SQLite from "expo-sqlite";

// Initialize and export a shared SQLite instance for the app.
const db = SQLite.openDatabaseSync("yourbar.db");

let initPromise;
let taskQueue = Promise.resolve();

export function initDatabase() {
  if (!initPromise) {
    initPromise = db.execAsync(`
      PRAGMA foreign_keys = ON;
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

function enqueue(work) {
  const next = taskQueue.then(work, work);
  taskQueue = next.catch((e) => {
    console.warn("[sqlite] queue error", e);
  });
  return next;
}

export async function query(sql, params = []) {
  return enqueue(async () => {
    await initDatabase();
    const trimmed = sql.trim().toLowerCase();
    if (trimmed.startsWith("select")) {
      const rows = await db.getAllAsync(sql, params);
      return {
        rows: {
          _array: rows,
          length: rows.length,
          item: (i) => rows[i],
        },
      };
    }
    return db.runAsync(sql, params);
  });
}

// Serialize all write operations across modules to avoid DB locked errors
export function withExclusiveWriteAsync(work) {
  if (typeof work !== "function") throw new Error("work must be a function");
  return enqueue(async () => {
    await initDatabase();
    return SQLite.withExclusiveTransactionAsync
      ? SQLite.withExclusiveTransactionAsync(db, work)
      : db.withExclusiveTransactionAsync(work);
  });
}

export default db;


import * as SQLite from "expo-sqlite";

// Initialize and export a shared SQLite instance for the app.
const db = SQLite.openDatabaseSync("yourbar.db");

let initPromise;

export function initDatabase() {
  if (!initPromise) {
    initPromise = db.execAsync(`
      CREATE TABLE IF NOT EXISTS cocktails (id INTEGER PRIMARY KEY NOT NULL, data TEXT);
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
    `);
  }
  return initPromise;
}

export async function query(sql, params = []) {
  // assume initDatabase() has been invoked at app startup
  await initPromise;
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
}

export default db;


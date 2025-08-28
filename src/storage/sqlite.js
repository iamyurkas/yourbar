import * as SQLite from "expo-sqlite";

// Initialize and export a shared SQLite instance for the app.
const db = SQLite.openDatabaseSync("yourbar.db");

let initPromise;

export function initDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync(`
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
    })();
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


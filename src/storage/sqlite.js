import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("yourbar.db");

let initPromise;

export function initDatabase() {
  if (!initPromise) {
    initPromise = db.execAsync(`
      CREATE TABLE IF NOT EXISTS cocktails (id INTEGER PRIMARY KEY NOT NULL, data TEXT);
      CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY NOT NULL, data TEXT);
    `);
  }
  return initPromise;
}

export async function query(sql, params = []) {
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
}

export default db;


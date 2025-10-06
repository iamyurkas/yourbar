import * as SQLite from "expo-sqlite";

export type SQLiteDatabase = ReturnType<typeof SQLite.openDatabaseSync>;

export type SQLiteTransaction<T = unknown> = (
  db: SQLiteDatabase
) => Promise<T> | T;

const DB_NAME = "yourbar.db";

const readConnection = SQLite.openDatabaseSync(DB_NAME);
const writeConnection = SQLite.openDatabaseSync(DB_NAME);

async function ensurePragmas(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA busy_timeout = 0;");
}

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;
  initialized = true;
  await Promise.all([ensurePragmas(readConnection), ensurePragmas(writeConnection)]);
  try {
    await writeConnection.execAsync("PRAGMA journal_mode=WAL;");
  } catch (error) {
    console.warn("[db] failed to enable WAL", error);
  }
}

export async function runRead<T>(sql: string, params: Array<string | number | null> = []) {
  await ensureDatabase();
  const rows = await readConnection.getAllAsync(sql, params);
  return rows as T[];
}

export async function runWrite(sql: string, params: Array<string | number | null> = []) {
  await ensureDatabase();
  await writeConnection.runAsync(sql, params);
}

export async function runTransaction<T>(work: SQLiteTransaction<T>) {
  await ensureDatabase();
  await writeConnection.execAsync("BEGIN IMMEDIATE");
  try {
    const result = await work(writeConnection);
    await writeConnection.execAsync("COMMIT");
    return result;
  } catch (error) {
    try {
      await writeConnection.execAsync("ROLLBACK");
    } catch (rollbackError) {
      console.warn("[db] rollback error", rollbackError);
    }
    throw error;
  }
}


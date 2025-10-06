import { runTransaction, runWrite, runRead } from "./db";
import { MIGRATIONS } from "./migrations/manifest";

const META_TABLE = "migrations_meta";

export async function runMigrations() {
  await runWrite(
    `CREATE TABLE IF NOT EXISTS ${META_TABLE} (id TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`
  );

  const appliedRows = await runRead<{ id: string }>(
    `SELECT id FROM ${META_TABLE}`
  );
  const applied = new Set(appliedRows.map((r) => r.id));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    await runTransaction(async (db) => {
      await db.execAsync(migration.sql);
      await db.runAsync(
        `INSERT OR REPLACE INTO ${META_TABLE} (id, applied_at) VALUES (?, strftime('%s','now'))`,
        [migration.id]
      );
    });
  }
}


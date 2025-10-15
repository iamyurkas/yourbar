/**
 * The original project used a SQLite-backed storage layer for cocktails and
 * ingredients. That persistence mechanism has been removed, so this module now
 * provides minimal stub implementations that satisfy existing imports while
 * signalling that database operations are unavailable.
 */

export async function initDatabase(): Promise<void> {
  // Nothing to initialise – storage has been removed.
}

export async function query(): Promise<never> {
  throw new Error("Database storage has been removed.");
}

export async function withWriteTransactionAsync<T>(work?: (tx: any) => Promise<T> | T): Promise<T> {
  if (typeof work !== "function") {
    throw new Error("write transactions are unavailable – storage has been removed.");
  }
  // Execute the callback immediately so callers that expect the promise to
  // resolve can still continue their control flow without persisting anything.
  return await work({
    runAsync: () => {
      throw new Error("Database storage has been removed.");
    },
    execAsync: () => {
      throw new Error("Database storage has been removed.");
    },
    getAllAsync: () => {
      throw new Error("Database storage has been removed.");
    },
    getFirstAsync: () => {
      throw new Error("Database storage has been removed.");
    },
  });
}

export default null;

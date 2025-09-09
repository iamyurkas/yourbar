export function openDatabaseSync() {
  return {
    execAsync: async () => {},
    getAllAsync: async () => [],
    runAsync: async () => {},
    withTransactionAsync: async (cb) => cb(),
  };
}
export function setTracer() {}
export function withTransactionAsync(_db, cb) {
  return cb();
}

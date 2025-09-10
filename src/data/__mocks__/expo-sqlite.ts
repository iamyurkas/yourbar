let tracer;

export function openDatabaseSync() {
  return {
    execAsync: async (sql, params) => {
      tracer?.(sql, params);
    },
    getAllAsync: async (sql, params) => {
      tracer?.(sql, params);
      return [];
    },
    runAsync: async (sql, params) => {
      tracer?.(sql, params);
    },
    withTransactionAsync: async (cb) => cb(),
  };
}
export function setTracer(fn) {
  tracer = fn;
}
export function withTransactionAsync(_db, cb) {
  return cb();
}

export function profile<T>(id: string, fn: () => T): T {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  try {
    return fn();
  } finally {
    const duration = Date.now() - startTime;
    const endedAt = new Date().toISOString();
    console.log(`[${endedAt}] ${id} start=${startedAt} duration=${duration}ms`);
  }
}

export async function profileAsync<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - startTime;
    const endedAt = new Date().toISOString();
    console.log(`[${endedAt}] ${id} start=${startedAt} duration=${duration}ms`);
  }
}

export function makeProfiler(id: string) {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  return {
    step(label: string) {
      const now = Date.now();
      console.log(
        `[${new Date(now).toISOString()}] ${id} ${label} start=${startedAt} +${now - startTime}ms`
      );
    },
  };
}

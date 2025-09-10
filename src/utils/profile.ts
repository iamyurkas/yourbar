export function profile<T>(id: string, fn: () => T): T {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  try {
    return fn();
  } finally {
    const duration = Date.now() - startTime;
    console.log(`[${id}] start=${startedAt} duration=${duration}ms`);
  }
}

export async function profileAsync<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - startTime;
    console.log(`[${id}] start=${startedAt} duration=${duration}ms`);
  }
}

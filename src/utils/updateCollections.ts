type Key = string | number | symbol;

const arrayIndexCache: WeakMap<
  ReadonlyArray<Record<string, any>>,
  Map<Key, Map<any, number>>
> = new WeakMap();

function getIndexMap<T extends Record<string, any>>(
  list: ReadonlyArray<T>,
  key: Key
): Map<any, number> {
  let cached = arrayIndexCache.get(list);
  if (!cached) {
    cached = new Map();
    arrayIndexCache.set(list, cached);
  }

  if (!cached.has(key)) {
    const indexMap = new Map<any, number>();
    list.forEach((item, idx) => {
      const id = item?.[key as keyof T];
      if (id != null) {
        indexMap.set(id, idx);
      }
    });
    cached.set(key, indexMap);
  }

  return cached.get(key)!;
}

function cloneIndexCache(
  source: Map<Key, Map<any, number>> | undefined,
  key: Key,
  map: Map<any, number>
) {
  if (!source) {
    return new Map([[key, map]]);
  }
  const next = new Map<Key, Map<any, number>>();
  source.forEach((value, cacheKey) => {
    next.set(cacheKey, cacheKey === key ? map : value);
  });
  if (!next.has(key)) {
    next.set(key, map);
  }
  return next;
}

export function updateArrayItemsById<T extends Record<string, any>>(
  list: ReadonlyArray<T>,
  updates: Partial<T> | Array<Partial<T>>,
  key: Key = "id"
): T[] {
  if (!Array.isArray(list) || list.length === 0) return list as T[];
  const updateList = Array.isArray(updates) ? updates : [updates];
  if (updateList.length === 0) return list as T[];

  const indexMap = getIndexMap(list, key);
  let next: T[] | null = null;

  updateList.forEach((update) => {
    const id = update?.[key as keyof typeof update];
    if (id == null) return;
    const idx = indexMap.get(id);
    if (idx == null) return;
    if (!next) next = list.slice() as T[];
    const prev = next[idx];
    next[idx] = { ...prev, ...update } as T;
  });

  if (!next) return list as T[];

  const previousCache = arrayIndexCache.get(list);
  arrayIndexCache.set(next, cloneIndexCache(previousCache, key, indexMap));
  arrayIndexCache.delete(list);

  return next;
}

export function updateMapItemsById<T extends Record<string, any>>(
  map: Map<any, T>,
  updates: Partial<T> | Array<Partial<T>>,
  key: Key = "id"
): Map<any, T> {
  if (!(map instanceof Map) || map.size === 0) return map;
  const updateList = Array.isArray(updates) ? updates : [updates];
  if (updateList.length === 0) return map;

  let next: Map<any, T> | null = null;

  updateList.forEach((update) => {
    const id = update?.[key as keyof typeof update];
    if (id == null) return;
    const source = next ?? map;
    const prev = source.get(id);
    if (!prev) return;
    if (!next) {
      next = new Map(map);
    }
    next.set(id, { ...prev, ...update });
  });

  return next ?? map;
}


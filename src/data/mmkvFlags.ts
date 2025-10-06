import { ENABLE_FLAG_INSTRUMENTATION, USE_MMKV_FLAGS } from "../constants/featureFlags";

export type FlagKey = "in_bar" | "in_shopping";

type FlagPair = {
  inBar: boolean;
  inShopping: boolean;
};

type MMKVLike = {
  getBool(key: string): boolean | undefined;
  set(key: string, value: boolean | number | string): void;
  getAllKeys(): string[];
  delete(key: string): void;
};

let mmkv: MMKVLike | null = null;

if (USE_MMKV_FLAGS) {
  try {
    const maybeRequire = (globalThis as Record<string, unknown>).require;
    if (typeof maybeRequire === "function") {
      const { MMKV } = maybeRequire("react-native-mmkv") as {
        MMKV: new (options: { id: string }) => MMKVLike;
      };
      mmkv = new MMKV({ id: "ingredient-flags" });
    }
  } catch (error) {
    console.warn("[mmkvFlags] failed to initialize MMKV, falling back to memory", error);
  }
}

const memoryStore = new Map<string, FlagPair>();

function log(message: string, ...args: unknown[]) {
  if (ENABLE_FLAG_INSTRUMENTATION) {
    console.log(`[mmkvFlags] ${message}`, ...args);
  }
}

function formatKey(id: string, key: FlagKey) {
  return `${id}:${key}`;
}

export function getFlag(id: string, key: FlagKey): boolean | undefined {
  if (mmkv) {
    const value = mmkv.getBool(formatKey(id, key));
    return value ?? undefined;
  }
  const entry = memoryStore.get(id);
  if (!entry) return undefined;
  return key === "in_bar" ? entry.inBar : entry.inShopping;
}

export function setFlag(id: string, key: FlagKey, value: boolean) {
  if (mmkv) {
    mmkv.set(formatKey(id, key), value ? 1 : 0);
  } else {
    const prev = memoryStore.get(id) ?? { inBar: false, inShopping: false };
    const next: FlagPair = {
      inBar: key === "in_bar" ? value : prev.inBar,
      inShopping: key === "in_shopping" ? value : prev.inShopping,
    };
    memoryStore.set(id, next);
  }
  log(`setFlag id=${id} key=${key} value=${value}`);
}

export function readAllFlags(): Map<string, FlagPair> {
  if (mmkv) {
    const result = new Map<string, FlagPair>();
    for (const key of mmkv.getAllKeys()) {
      const [id, flag] = key.split(":");
      if (!id || (flag !== "in_bar" && flag !== "in_shopping")) continue;
      const current = result.get(id) ?? { inBar: false, inShopping: false };
      const value = !!mmkv.getBool(key);
      if (flag === "in_bar") current.inBar = value;
      else current.inShopping = value;
      result.set(id, current);
    }
    return result;
  }
  return new Map(memoryStore);
}

export async function flushToSQLiteBatch(
  writer: (changes: Array<{ id: string; inBar?: boolean; inShopping?: boolean }>) => Promise<void>
) {
  const entries = Array.from(readAllFlags().entries());
  if (!entries.length) return;
  const updates = entries.map(([id, flags]) => ({
    id,
    inBar: flags.inBar,
    inShopping: flags.inShopping,
  }));
  await writer(updates);
  if (!mmkv) {
    for (const id of memoryStore.keys()) {
      memoryStore.delete(id);
    }
  }
  log(`flushToSQLiteBatch wrote ${updates.length} rows`);
}


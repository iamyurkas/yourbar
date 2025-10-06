import { useMemo } from "react";
import { create } from "zustand";
import { createStore } from "zustand/vanilla";
import { applyFlagsBatch } from "../data/ingredients.repo";
import { updateDerivedForToggle } from "../data/derived";
import {
  ENABLE_FLAG_INSTRUMENTATION,
  FLAG_WRITE_BATCH_WINDOW_MS,
  FLAG_WRITE_MAX_RETRIES,
  USE_MMKV_FLAGS,
} from "../constants/featureFlags";
import { flushToSQLiteBatch, readAllFlags, setFlag } from "../data/mmkvFlags";

type FlagPair = {
  inBar: boolean;
  inShopping: boolean;
};

type FlagUpdate = Partial<FlagPair>;

type IngredientFlagState = {
  inBarMap: Record<string, boolean>;
  inShoppingMap: Record<string, boolean>;
};

type IngredientFlagActions = {
  toggleInBar(id: string): void;
  toggleInShopping(id: string): void;
  setFlags(id: string, flags: FlagUpdate, options?: { persisted?: boolean }): void;
  bulkApplyFlags(flags: Map<string, FlagPair>): void;
  flushPendingWrites(): Promise<void>;
};

type IngredientFlagStore = IngredientFlagState & IngredientFlagActions;

export type FlagFlushEvent = {
  id: string;
  duration: number;
  target: FlagUpdate;
};

type PendingEntry = {
  id: string;
  target: FlagUpdate;
  previous: FlagUpdate;
  retries: number;
};

const persistedFlags = new Map<string, FlagPair>();
const pendingMutations = new Map<string, PendingEntry>();

const flushListeners = new Set<(event: FlagFlushEvent) => void>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;

function log(message: string, ...args: unknown[]) {
  if (ENABLE_FLAG_INSTRUMENTATION) {
    console.log(`[ingredient-flags] ${message}`, ...args);
  }
}

function warn(message: string, ...args: unknown[]) {
  if (ENABLE_FLAG_INSTRUMENTATION) {
    console.warn(`[ingredient-flags] ${message}`, ...args);
  }
}

function ensurePendingEntry(id: string, change: FlagUpdate, previous: FlagUpdate) {
  const existing = pendingMutations.get(id);
  if (existing) {
    if (change.inBar !== undefined) existing.target.inBar = change.inBar;
    if (change.inShopping !== undefined)
      existing.target.inShopping = change.inShopping;
    if (previous.inBar !== undefined && existing.previous.inBar === undefined)
      existing.previous.inBar = previous.inBar;
    if (
      previous.inShopping !== undefined &&
      existing.previous.inShopping === undefined
    )
      existing.previous.inShopping = previous.inShopping;
    return existing;
  }
  const entry: PendingEntry = {
    id,
    target: { ...change },
    previous: { ...previous },
    retries: 0,
  };
  pendingMutations.set(id, entry);
  return entry;
}

function shouldDrop(entry: PendingEntry) {
  const { target, previous } = entry;
  const inBarMatch =
    target.inBar === undefined ||
    (previous.inBar !== undefined && target.inBar === previous.inBar);
  const inShoppingMatch =
    target.inShopping === undefined ||
    (previous.inShopping !== undefined &&
      target.inShopping === previous.inShopping);
  return inBarMatch && inShoppingMatch;
}

function scheduleFlush(delay = FLAG_WRITE_BATCH_WINDOW_MS) {
  if (flushTimer) clearTimeout(flushTimer);
  if (!pendingMutations.size) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, delay);
}

function notifyFlush(event: FlagFlushEvent) {
  if (!flushListeners.size) return;
  for (const listener of flushListeners) {
    listener(event);
  }
}

export function subscribeToFlagFlush(
  listener: (event: FlagFlushEvent) => void
) {
  flushListeners.add(listener);
  return () => {
    flushListeners.delete(listener);
  };
}

type PersistenceWriter = typeof applyFlagsBatch;

let persistFlags: PersistenceWriter = applyFlagsBatch;

export function setPersistenceWriter(writer: PersistenceWriter) {
  persistFlags = writer;
}

async function flushQueue() {
  if (!pendingMutations.size) return;
  if (flushPromise) return flushPromise;

  const entries = Array.from(pendingMutations.values()).map((entry) => ({
    id: entry.id,
    target: { ...entry.target },
    previous: { ...entry.previous },
    retries: entry.retries,
  }));

  flushPromise = (async () => {
    const start = Date.now();
    const updates = entries
      .map((entry) => ({
        id: entry.id,
        inBar: entry.target.inBar,
        inShopping: entry.target.inShopping,
      }))
      .filter(
        (u) => u.inBar !== undefined || u.inShopping !== undefined
      );
    if (!updates.length) {
      for (const entry of entries) {
        pendingMutations.delete(entry.id);
      }
      return;
    }
    log(`flush start count=${updates.length}`);
    try {
      await persistFlags(updates);
      for (const entry of entries) {
        const persisted = persistedFlags.get(entry.id) ?? {
          inBar: entry.previous.inBar ?? false,
          inShopping: entry.previous.inShopping ?? false,
        };
        if (entry.target.inBar !== undefined) {
          persisted.inBar = entry.target.inBar;
        }
        if (entry.target.inShopping !== undefined) {
          persisted.inShopping = entry.target.inShopping;
        }
        persistedFlags.set(entry.id, persisted);
        pendingMutations.delete(entry.id);
        notifyFlush({
          id: entry.id,
          duration: Date.now() - start,
          target: { ...entry.target },
        });
      }
      log(`flush success duration=${Date.now() - start}ms`);
    } catch (error) {
      warn(`flush failed`, error);
      const retryIds: string[] = [];
      for (const entry of entries) {
        const pending = pendingMutations.get(entry.id);
        if (!pending) continue;
        pending.retries += 1;
        if (pending.retries >= FLAG_WRITE_MAX_RETRIES) {
          pendingMutations.delete(entry.id);
          ingredientFlagsStore.setState((state) => {
            const inBarMap = { ...state.inBarMap };
            const inShoppingMap = { ...state.inShoppingMap };
            if (pending.previous.inBar !== undefined) {
              inBarMap[pending.id] = pending.previous.inBar;
            }
            if (pending.previous.inShopping !== undefined) {
              inShoppingMap[pending.id] = pending.previous.inShopping;
            }
            updateDerivedForToggle(pending.id, {
              inBar: inBarMap[pending.id] ?? false,
              inShopping: inShoppingMap[pending.id] ?? false,
            });
            return { inBarMap, inShoppingMap };
          });
        } else {
          retryIds.push(entry.id);
        }
      }
      if (retryIds.length) {
        const maxRetries = Math.max(
          ...retryIds.map((id) => pendingMutations.get(id)?.retries ?? 0)
        );
        const retryDelay = Math.min(
          FLAG_WRITE_BATCH_WINDOW_MS * 2 ** maxRetries,
          3000
        );
        scheduleFlush(retryDelay);
      }
      throw error;
    } finally {
      flushPromise = null;
    }
  })();

  return flushPromise;
}

const ingredientFlagsStore = createStore<IngredientFlagStore>((set, get) => ({
  inBarMap: {},
  inShoppingMap: {},
  toggleInBar(id: string) {
    const current = !!get().inBarMap[id];
    const next = !current;
    set((state) => ({
      inBarMap: { ...state.inBarMap, [id]: next },
    }));
    const previous: FlagUpdate = { inBar: current };
    const entry = ensurePendingEntry(id, { inBar: next }, previous);
    if (shouldDrop(entry)) {
      pendingMutations.delete(id);
    }
    scheduleFlush();
    if (USE_MMKV_FLAGS) {
      setFlag(id, "in_bar", next);
    }
    updateDerivedForToggle(id, {
      inBar: next,
      inShopping: get().inShoppingMap[id] ?? false,
    });
  },
  toggleInShopping(id: string) {
    const current = !!get().inShoppingMap[id];
    const next = !current;
    set((state) => ({
      inShoppingMap: { ...state.inShoppingMap, [id]: next },
    }));
    const previous: FlagUpdate = { inShopping: current };
    const entry = ensurePendingEntry(id, { inShopping: next }, previous);
    if (shouldDrop(entry)) {
      pendingMutations.delete(id);
    }
    scheduleFlush();
    if (USE_MMKV_FLAGS) {
      setFlag(id, "in_shopping", next);
    }
    updateDerivedForToggle(id, {
      inBar: get().inBarMap[id] ?? false,
      inShopping: next,
    });
  },
  setFlags(id: string, flags: FlagUpdate, options?: { persisted?: boolean }) {
    set((state) => {
      const inBarMap = { ...state.inBarMap };
      const inShoppingMap = { ...state.inShoppingMap };
      if (flags.inBar !== undefined) inBarMap[id] = flags.inBar;
      if (flags.inShopping !== undefined) inShoppingMap[id] = flags.inShopping;
      return { inBarMap, inShoppingMap };
    });
    const persisted = persistedFlags.get(id) ?? {
      inBar: flags.inBar ?? false,
      inShopping: flags.inShopping ?? false,
    };
    if (flags.inBar !== undefined) persisted.inBar = flags.inBar;
    if (flags.inShopping !== undefined) persisted.inShopping = flags.inShopping;
    if (options?.persisted !== false) {
      persistedFlags.set(id, persisted);
    }
    if (USE_MMKV_FLAGS) {
      if (flags.inBar !== undefined) setFlag(id, "in_bar", flags.inBar);
      if (flags.inShopping !== undefined)
        setFlag(id, "in_shopping", flags.inShopping);
    }
    updateDerivedForToggle(id, {
      inBar: get().inBarMap[id] ?? false,
      inShopping: get().inShoppingMap[id] ?? false,
    });
  },
  bulkApplyFlags(flags) {
    set((state) => {
      const inBarMap = { ...state.inBarMap };
      const inShoppingMap = { ...state.inShoppingMap };
      for (const [id, values] of flags.entries()) {
        const pending = pendingMutations.get(id);
        const nextInBar =
          pending && pending.target.inBar !== undefined
            ? pending.target.inBar
            : values.inBar;
        const nextInShopping =
          pending && pending.target.inShopping !== undefined
            ? pending.target.inShopping
            : values.inShopping;
        inBarMap[id] = nextInBar;
        inShoppingMap[id] = nextInShopping;
        persistedFlags.set(id, { ...values });
        if (USE_MMKV_FLAGS) {
          setFlag(id, "in_bar", nextInBar);
          setFlag(id, "in_shopping", nextInShopping);
        }
      }
      return { inBarMap, inShoppingMap };
    });
  },
  async flushPendingWrites() {
    await flushQueue();
  },
}));

const useIngredientFlagsBase = create(ingredientFlagsStore);

type Selector<T> = (state: IngredientFlagState) => T;

const inBarSelectors = new Map<string, Selector<boolean>>();
const inShoppingSelectors = new Map<string, Selector<boolean>>();

function getInBarSelector(id: string): Selector<boolean> {
  if (!inBarSelectors.has(id)) {
    inBarSelectors.set(id, (state) => !!state.inBarMap[id]);
  }
  return inBarSelectors.get(id)!;
}

function getInShoppingSelector(id: string): Selector<boolean> {
  if (!inShoppingSelectors.has(id)) {
    inShoppingSelectors.set(id, (state) => !!state.inShoppingMap[id]);
  }
  return inShoppingSelectors.get(id)!;
}

export const selectors = {
  useInBar(id: string) {
    const selector = useMemo(() => getInBarSelector(id), [id]);
    return useIngredientFlagsBase(selector);
  },
  useInShopping(id: string) {
    const selector = useMemo(() => getInShoppingSelector(id), [id]);
    return useIngredientFlagsBase(selector);
  },
};

export const { toggleInBar, toggleInShopping, setFlags, bulkApplyFlags } =
  ingredientFlagsStore.getState();

export function useIngredientFlags<T>(selector: Selector<T>) {
  return useIngredientFlagsBase(selector);
}

export function __resetIngredientFlagsStore() {
  persistedFlags.clear();
  pendingMutations.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  persistFlags = applyFlagsBatch;
  ingredientFlagsStore.setState({ inBarMap: {}, inShoppingMap: {} });
}

export async function bootstrapFlagsFromPersistence() {
  if (USE_MMKV_FLAGS) {
    const all = readAllFlags();
    ingredientFlagsStore.getState().bulkApplyFlags(all);
  }
}

export async function flushFlagsToSQLite() {
  if (USE_MMKV_FLAGS) {
    await flushToSQLiteBatch(persistFlags);
  } else {
    await ingredientFlagsStore.getState().flushPendingWrites();
  }
}

export default ingredientFlagsStore;


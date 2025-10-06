declare const require: (name: string) => any;

export interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let storage: StorageLike;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require("@react-native-async-storage/async-storage");
  const asyncStorage = module?.default ?? module;
  if (
    asyncStorage &&
    typeof asyncStorage.getItem === "function" &&
    typeof asyncStorage.setItem === "function"
  ) {
    storage = asyncStorage as StorageLike;
  }
} catch (error) {
  // ignore, fall back to in-memory storage
}

if (!storage) {
  const memory = new Map<string, string>();
  storage = {
    async getItem(key) {
      return memory.has(key) ? memory.get(key)! : null;
    },
    async setItem(key, value) {
      memory.set(key, value);
    },
    async removeItem(key) {
      memory.delete(key);
    },
  };
}

export default storage;

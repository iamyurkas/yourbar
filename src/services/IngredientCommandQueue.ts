import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleIngredientsInBar } from "../domain/ingredients";

const STORAGE_KEY = "ingredient_command_log_v1";
const RETRY_DELAY_MS = 1500;

interface ToggleInBarCommand {
  id: string;
  type: "toggleInBar";
  payload: {
    ids: number[];
  };
  timestamp: number;
  attempts?: number;
}

type IngredientCommand = ToggleInBarCommand;

let queue: IngredientCommand[] = [];
let initPromise: Promise<void> | null = null;
let processing = false;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeIds(ids: Array<number | string | null | undefined>): number[] {
  const unique = new Set<number>();
  ids.forEach((value) => {
    const num = Number(value);
    if (Number.isFinite(num)) {
      unique.add(num);
    }
  });
  return Array.from(unique);
}

async function persistQueue() {
  try {
    if (queue.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.warn("IngredientCommandQueue: failed to persist queue", error);
  }
}

async function loadQueue() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      queue = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      queue = parsed
        .map((item) => {
          if (item?.type === "toggleInBar" && Array.isArray(item?.payload?.ids)) {
            return {
              id: String(item.id ?? ""),
              type: "toggleInBar" as const,
              payload: { ids: normalizeIds(item.payload.ids) },
              timestamp: Number(item.timestamp ?? Date.now()),
              attempts: Number(item.attempts ?? 0) || 0,
            } satisfies ToggleInBarCommand;
          }
          return null;
        })
        .filter(Boolean) as IngredientCommand[];
    } else {
      queue = [];
    }
  } catch (error) {
    console.warn("IngredientCommandQueue: failed to load queue", error);
    queue = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

async function ensureReady() {
  if (!initPromise) {
    initPromise = loadQueue();
  }
  return initPromise;
}

async function processQueue() {
  await ensureReady();
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const command = queue[0];
      try {
        if (command.type === "toggleInBar") {
          await toggleIngredientsInBar(command.payload.ids);
        }
        queue.shift();
        await persistQueue();
      } catch (error) {
        command.attempts = (command.attempts ?? 0) + 1;
        console.warn(
          `IngredientCommandQueue: failed to apply command ${command.id}, attempt ${command.attempts}`,
          error
        );
        await wait(RETRY_DELAY_MS * Math.min(command.attempts + 1, 5));
      }
    }
  } finally {
    processing = false;
  }
}

export async function startIngredientCommandQueue() {
  await ensureReady();
  processQueue();
}

export async function enqueueToggleInBar(ids: Array<number | string>) {
  const normalized = normalizeIds(ids);
  if (!normalized.length) return;
  await ensureReady();
  const command: ToggleInBarCommand = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "toggleInBar",
    payload: { ids: normalized },
    timestamp: Date.now(),
    attempts: 0,
  };
  queue.push(command);
  await persistQueue();
  processQueue();
}

export function getPendingIngredientCommands() {
  return queue.slice();
}

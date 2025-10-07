export const USE_MMKV_FLAGS =
  typeof process !== "undefined" &&
  typeof process.env !== "undefined" &&
  process.env.EXPO_PUBLIC_USE_MMKV_FLAGS === "true";

export const ENABLE_FLAG_INSTRUMENTATION =
  typeof process !== "undefined" &&
  typeof process.env !== "undefined" &&
  process.env.EXPO_PUBLIC_ENABLE_FLAG_INSTRUMENTATION === "true";

export const FLAG_WRITE_BATCH_WINDOW_MS = (() => {
  const raw =
    typeof process !== "undefined" &&
    typeof process.env !== "undefined"
      ? process.env.EXPO_PUBLIC_FLAG_WRITE_BATCH_WINDOW_MS
      : undefined;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
})();

export const FLAG_WRITE_MAX_RETRIES = 5;


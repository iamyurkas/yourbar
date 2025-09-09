import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

/**
 * Helper factory for boolean settings stored in AsyncStorage.
 * Generates get/set/addListener methods.
 *
 * @param {string} key Storage key.
 * @param {boolean} defaultValue Value returned when storage is empty or on error.
 * @param {string} [eventName] Optional event emitted on value change.
 */
export function createBooleanSetting(key, defaultValue, eventName) {
  async function get() {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return defaultValue;
      return value === "true";
    } catch {
      return defaultValue;
    }
  }

  async function set(value) {
    try {
      await AsyncStorage.setItem(key, value ? "true" : "false");
    } catch {}
    if (eventName) DeviceEventEmitter.emit(eventName, value);
  }

  const addListener = eventName
    ? (listener) => DeviceEventEmitter.addListener(eventName, listener)
    : undefined;

  return { get, set, addListener };
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const USE_METRIC_KEY = "useMetric";
const IGNORE_GARNISH_KEY = "ignoreGarnish";
const KEEP_AWAKE_KEY = "keepAwake";

export const IGNORE_GARNISH_EVENT = "ignoreGarnishChanged";
export const KEEP_AWAKE_EVENT = "keepAwakeChanged";

export async function getUseMetric() {
  try {
    const value = await AsyncStorage.getItem(USE_METRIC_KEY);
    if (value === null) return true;
    return value === "true";
  } catch {
    return true;
  }
}

export async function setUseMetric(value) {
  try {
    await AsyncStorage.setItem(USE_METRIC_KEY, value ? "true" : "false");
  } catch {}
}

export async function getIgnoreGarnish() {
  try {
    const value = await AsyncStorage.getItem(IGNORE_GARNISH_KEY);
    if (value === null) return false;
    return value === "true";
  } catch {
    return false;
  }
}

export async function setIgnoreGarnish(value) {
  try {
    await AsyncStorage.setItem(IGNORE_GARNISH_KEY, value ? "true" : "false");
  } catch {}
  DeviceEventEmitter.emit(IGNORE_GARNISH_EVENT, value);
}

export function addIgnoreGarnishListener(listener) {
  return DeviceEventEmitter.addListener(IGNORE_GARNISH_EVENT, listener);
}

export async function getKeepAwake() {
  try {
    const value = await AsyncStorage.getItem(KEEP_AWAKE_KEY);
    if (value === null) return false;
    return value === "true";
  } catch {
    return false;
  }
}

export async function setKeepAwake(value) {
  try {
    await AsyncStorage.setItem(KEEP_AWAKE_KEY, value ? "true" : "false");
  } catch {}
  DeviceEventEmitter.emit(KEEP_AWAKE_EVENT, value);
}

export function addKeepAwakeListener(listener) {
  return DeviceEventEmitter.addListener(KEEP_AWAKE_EVENT, listener);
}

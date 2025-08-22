import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const USE_METRIC_KEY = "useMetric";
const IGNORE_GARNISH_KEY = "ignoreGarnish";
const KEEP_AWAKE_KEY = "keepAwake";
const FAVORITES_MIN_RATING_KEY = "favoritesMinRating";
const TABS_ON_TOP_KEY = "tabsOnTop";
const ALLOW_SUBSTITUTES_KEY = "allowSubstitutes";
const START_SCREEN_KEY = "startScreen"; // format: "cocktails:All"

export const IGNORE_GARNISH_EVENT = "ignoreGarnishChanged";
export const KEEP_AWAKE_EVENT = "keepAwakeChanged";
export const FAVORITES_MIN_RATING_EVENT = "favoritesMinRatingChanged";
export const TABS_ON_TOP_EVENT = "tabsOnTopChanged";
export const ALLOW_SUBSTITUTES_EVENT = "allowSubstitutesChanged";

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
    if (value === null) return true;
    return value === "true";
  } catch {
    return true;
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

export async function getAllowSubstitutes() {
  try {
    const value = await AsyncStorage.getItem(ALLOW_SUBSTITUTES_KEY);
    if (value === null) return true;
    return value === "true";
  } catch {
    return true;
  }
}

export async function setAllowSubstitutes(value) {
  try {
    await AsyncStorage.setItem(ALLOW_SUBSTITUTES_KEY, value ? "true" : "false");
  } catch {}
  DeviceEventEmitter.emit(ALLOW_SUBSTITUTES_EVENT, value);
}

export function addAllowSubstitutesListener(listener) {
  return DeviceEventEmitter.addListener(ALLOW_SUBSTITUTES_EVENT, listener);
}

export async function getKeepAwake() {
  try {
    const value = await AsyncStorage.getItem(KEEP_AWAKE_KEY);
    if (value === null) return true;
    return value === "true";
  } catch {
    return true;
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

export async function getTabsOnTop() {
  try {
    const value = await AsyncStorage.getItem(TABS_ON_TOP_KEY);
    if (value === null) return true;
    return value === "true";
  } catch {
    return true;
  }
}

export async function setTabsOnTop(value) {
  try {
    await AsyncStorage.setItem(TABS_ON_TOP_KEY, value ? "true" : "false");
  } catch {}
  DeviceEventEmitter.emit(TABS_ON_TOP_EVENT, value);
}

export function addTabsOnTopListener(listener) {
  return DeviceEventEmitter.addListener(TABS_ON_TOP_EVENT, listener);
}

export async function getFavoritesMinRating() {
  try {
    const value = await AsyncStorage.getItem(FAVORITES_MIN_RATING_KEY);
    if (value === null) return 0;
    const n = parseInt(value, 10);
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

export async function setFavoritesMinRating(value) {
  try {
    await AsyncStorage.setItem(
      FAVORITES_MIN_RATING_KEY,
      String(value)
    );
  } catch {}
  DeviceEventEmitter.emit(FAVORITES_MIN_RATING_EVENT, value);
}

export function addFavoritesMinRatingListener(listener) {
  return DeviceEventEmitter.addListener(
    FAVORITES_MIN_RATING_EVENT,
    listener
  );
}

export async function getStartScreen() {
  try {
    const value = await AsyncStorage.getItem(START_SCREEN_KEY);
    return value || "cocktails:All";
  } catch {
    return "cocktails:All";
  }
}

export async function setStartScreen(value) {
  try {
    await AsyncStorage.setItem(START_SCREEN_KEY, value);
  } catch {}
}

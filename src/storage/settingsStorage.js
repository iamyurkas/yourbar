import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { createBooleanSetting } from "./createBooleanSetting";

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

export const { get: getUseMetric, set: setUseMetric } =
  createBooleanSetting(USE_METRIC_KEY, true);

export const {
  get: getIgnoreGarnish,
  set: setIgnoreGarnish,
  addListener: addIgnoreGarnishListener,
} = createBooleanSetting(
  IGNORE_GARNISH_KEY,
  true,
  IGNORE_GARNISH_EVENT
);

export const {
  get: getAllowSubstitutes,
  set: setAllowSubstitutes,
  addListener: addAllowSubstitutesListener,
} = createBooleanSetting(
  ALLOW_SUBSTITUTES_KEY,
  true,
  ALLOW_SUBSTITUTES_EVENT
);

export const {
  get: getKeepAwake,
  set: setKeepAwake,
  addListener: addKeepAwakeListener,
} = createBooleanSetting(KEEP_AWAKE_KEY, true, KEEP_AWAKE_EVENT);

export const {
  get: getTabsOnTop,
  set: setTabsOnTop,
  addListener: addTabsOnTopListener,
} = createBooleanSetting(TABS_ON_TOP_KEY, true, TABS_ON_TOP_EVENT);

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

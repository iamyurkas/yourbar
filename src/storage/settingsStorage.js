import AsyncStorage from "@react-native-async-storage/async-storage";

const USE_METRIC_KEY = "useMetric";

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

import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_TAGS_KEY = "user_ingredient_tags";

export async function getUserTags() {
  try {
    const json = await AsyncStorage.getItem(USER_TAGS_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (e) {
    console.error("Failed to load user tags", e);
    return [];
  }
}

export async function saveUserTags(tags) {
  try {
    await AsyncStorage.setItem(USER_TAGS_KEY, JSON.stringify(tags));
  } catch (e) {
    console.error("Failed to save user tags", e);
  }
}

export const getAllTags = async () => {
  try {
    const json = await AsyncStorage.getItem(USER_TAGS_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error("Failed to load tags:", error);
    return [];
  }
};

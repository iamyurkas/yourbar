import React, { useCallback, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useTabMemory } from "../../context/TabMemoryContext";

export default function CocktailDetailsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { getTab } = useTabMemory();
  const previousTab = getTab("cocktails");

  const handleGoBack = useCallback(() => {
    if (previousTab) navigation.navigate(previousTab);
    else navigation.goBack();
  }, [navigation, previousTab]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.headerBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons
            name={Platform.OS === "ios" ? "arrow-back-ios" : "arrow-back"}
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleGoBack, theme.colors.onSurface]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      handleGoBack();
    });
    return unsub;
  }, [navigation, handleGoBack]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Cocktails' Details coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20 },
  headerBackBtn: { paddingHorizontal: 8, paddingVertical: 4 },
});

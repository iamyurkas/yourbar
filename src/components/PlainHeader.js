import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { HEADER_HEIGHT } from "../constants/layout";

export default function PlainHeader({ navigation, route, options, back }) {
  const theme = useTheme();
  const title = options.title !== undefined ? options.title : route.name;
  const tintColor = theme.colors.onSurface;

  const renderLeft = () => {
    if (options.headerLeft) {
      return options.headerLeft({ canGoBack: !!back, tintColor });
    }
    if (back && options.headerBackVisible !== false) {
      return (
        <TouchableOpacity
          onPress={navigation.goBack}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons
            name={Platform.OS === "ios" ? "arrow-back-ios" : "arrow-back"}
            size={24}
            color={tintColor}
          />
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderRight = () => {
    if (options.headerRight) {
      return options.headerRight({ tintColor });
    }
    return null;
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background, flex: 0 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
        {renderLeft()} 
        <Text style={[styles.title, { color: tintColor }]} numberOfLines={1}>
          {title}
        </Text>
        {renderRight()} 
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_HEIGHT,
    paddingHorizontal: 16,
    gap: 10,
  },
  iconBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "500",
    textAlign: "left",
  },
});


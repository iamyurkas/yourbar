import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";

export const TOP_TAB_BAR_HEIGHT = 48;

export default function TopTabBar({ state, descriptors, navigation, theme }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;
        const color = isFocused
          ? theme.colors.primary
          : theme.colors.onSurfaceVariant;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            android_ripple={{ color: "rgba(0,0,0,0.1)" }}
            style={styles.tab}
          >
            <Text style={{ color }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOP_TAB_BAR_HEIGHT,
    elevation: 4,
    zIndex: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});


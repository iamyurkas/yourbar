import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";

export const TOP_TAB_BAR_HEIGHT = 48;

export default function TopTabBar({ navigation, theme }) {
  const state = navigation.getState();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const label = route.name;
        const color = isFocused
          ? theme.colors.primary
          : theme.colors.onSurfaceVariant;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            android_ripple={{ color: theme.colors.surfaceVariant }}
            style={[
              styles.tab,
              isFocused && {
                borderBottomWidth: 3,
                borderBottomColor: theme.colors.primary,
                paddingBottom: 12,
              },
            ]}
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
    height: TOP_TAB_BAR_HEIGHT,
    elevation: 4,
    zIndex: 1,
    // remove bottom divider so active underline sits at the very bottom
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
});


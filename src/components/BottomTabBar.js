import React, { useContext } from "react";
import { View, Pressable, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { TabSwipeContext } from "./TabSwipe";

export default function BottomTabBar({ state, descriptors, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const swipe = useContext(TabSwipeContext) || { value: 0 };
  const tabCount = state.routes.length;
  const width = Dimensions.get("window").width;
  const tabWidth = width / tabCount;
  const index = state.index;

  const underlineStyle = useAnimatedStyle(
    () => {
      const offset = Math.max(-tabWidth, Math.min(tabWidth, -swipe.value));
      return {
        transform: [{ translateX: tabWidth * index + offset }],
      };
    },
    [index, tabWidth, swipe]
  );

  const activeColor =
    descriptors[state.routes[0].key].options.tabBarActiveTintColor ||
    theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {state.routes.map((route, idx) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;
        const isFocused = index === idx;
        const color = isFocused
          ? options.tabBarActiveTintColor || theme.colors.primary
          : options.tabBarInactiveTintColor || theme.colors.onSurfaceVariant;
        const icon = options.tabBarIcon
          ? options.tabBarIcon({ color, size: 24 })
          : null;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            android_ripple={{ color: theme.colors.surfaceVariant }}
            style={styles.tab}
          >
            {icon}
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
      <Animated.View
        style={[
          styles.underline,
          { width: tabWidth, backgroundColor: activeColor },
          underlineStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 0,
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  underline: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
  },
});

